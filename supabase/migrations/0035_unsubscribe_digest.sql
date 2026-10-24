-- ============================================================================
-- OpenStage — Fase 7B.3b (disiscrizione digest senza login)
-- Ogni preferenza ha un token casuale. Il link nel digest porta a /unsubscribe,
-- che disattiva solo `email_digest`: le notifiche di sicurezza restano intatte.
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

alter table public.notification_preferences
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists notification_preferences_unsubscribe_idx
  on public.notification_preferences (unsubscribe_token);

create or replace function public.unsubscribe_email_digest(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer := 0;
begin
  update public.notification_preferences
  set email_digest = false,
      updated_at = now()
  where unsubscribe_token = p_token;

  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

revoke all on function public.unsubscribe_email_digest(uuid) from public;
grant execute on function public.unsubscribe_email_digest(uuid) to anon, authenticated, service_role;

-- Aggiunge il link di disiscrizione al testo del digest.
create or replace function public.enqueue_weekly_digests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer := 0;
begin
  insert into public.email_queue (
    to_email, from_email, subject, text_body, category, idempotency_key, metadata
  )
  select
    p.email,
    'OpenStage <noreply@getopenstage.it>',
    case np.locale when 'en' then 'Your week on OpenStage' else 'La tua settimana su OpenStage' end,
    case np.locale
      when 'en' then
        E'Your saved nights this week:\n\n' || d.lines ||
        E'\n\nSee you out there.\nOpenStage\n\nUnsubscribe from the weekly digest: https://getopenstage.it/unsubscribe?token=' || np.unsubscribe_token
      else
        E'Le tue serate salvate questa settimana:\n\n' || d.lines ||
        E'\n\nCi vediamo in giro.\nOpenStage\n\nPer non ricevere più il digest: https://getopenstage.it/unsubscribe?token=' || np.unsubscribe_token
    end,
    'digest',
    'digest:' || p.id || ':' || to_char(now(), 'IYYY-IW'),
    jsonb_build_object('events', d.total)
  from public.profiles p
  join public.notification_preferences np on np.user_id = p.id
  cross join lateral (
    select
      string_agg(
        e.title || ' — ' || to_char(e.starts_at at time zone e.timezone, 'DD/MM HH24:MI') || coalesce(' · ' || e.city, ''),
        E'\n' order by e.starts_at asc
      ) as lines,
      count(*) as total
    from public.saved_events se
    join public.events e on e.id = se.event_id
    where se.profile_id = p.id
      and e.status = 'published'
      and e.starts_at >= now()
      and e.starts_at < now() + interval '7 days'
  ) d
  where np.email_digest
    and p.email is not null
    and d.total > 0
    and not exists (
      select 1 from public.email_queue q
      where q.idempotency_key = 'digest:' || p.id || ':' || to_char(now(), 'IYYY-IW')
    );

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
