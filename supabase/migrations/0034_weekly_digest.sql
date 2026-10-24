-- ============================================================================
-- OpenStage — Fase 7B.3b (digest settimanale)
-- Una volta a settimana, per chi ha attivato il digest, mette in coda una sola
-- email con le serate salvate nei prossimi 7 giorni. Se non c'è nulla, non
-- viene creata nessuna riga.
--
-- La coda viene poi svuotata dal worker già attivo. Nessun invio sincrono.
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

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
    to_email,
    from_email,
    subject,
    text_body,
    category,
    idempotency_key,
    metadata
  )
  select
    p.email,
    'OpenStage <noreply@getopenstage.it>',
    case np.locale
      when 'en' then 'Your week on OpenStage'
      else 'La tua settimana su OpenStage'
    end,
    case np.locale
      when 'en' then E'Your saved nights this week:\n\n' || d.lines || E'\n\nSee you out there.\nOpenStage'
      else E'Le tue serate salvate questa settimana:\n\n' || d.lines || E'\n\nCi vediamo in giro.\nOpenStage'
    end,
    'digest',
    'digest:' || p.id || ':' || to_char(now(), 'IYYY-IW'),
    jsonb_build_object('events', d.total)
  from public.profiles p
  join public.notification_preferences np on np.user_id = p.id
  cross join lateral (
    select
      string_agg(
        e.title || ' — ' ||
        to_char(e.starts_at at time zone e.timezone, 'DD/MM HH24:MI') ||
        coalesce(' · ' || e.city, ''),
        E'\n'
        order by e.starts_at asc
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

comment on function public.enqueue_weekly_digests() is
  'Mette in coda il digest settimanale opt-in per chi ha serate salvate nei prossimi 7 giorni.';

-- Una volta a settimana, lunedì mattina UTC. Se il job esiste già, lo sostituisce.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'openstage-weekly-digest') then
    perform cron.unschedule('openstage-weekly-digest');
  end if;
exception when others then
  null;
end $$;

select cron.schedule(
  'openstage-weekly-digest',
  '0 7 * * 1',
  $$select public.enqueue_weekly_digests();$$
);
