-- ============================================================================
-- OpenStage - Fase 9A (follow di artisti e locali)
-- 1. Tabella `follows` con RLS: ogni profilo gestisce solo le proprie righe.
-- 2. Divieto di seguire la propria scheda.
-- 3. Notifica in-app quando una scheda seguita pubblica un evento futuro.
-- 4. Digest settimanale esteso anche alle schede seguite, senza duplicati.
--
-- Nessun invito virale: quello resta fuori da questo blocco.
-- Idempotente.
-- ============================================================================

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid references public.artists (id) on delete cascade,
  venue_id uuid references public.venues (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_one_target check (
    (artist_id is not null and venue_id is null)
    or (artist_id is null and venue_id is not null)
  )
);

create unique index if not exists follows_artist_unique
  on public.follows (follower_id, artist_id)
  where artist_id is not null;
create unique index if not exists follows_venue_unique
  on public.follows (follower_id, venue_id)
  where venue_id is not null;
create index if not exists follows_artist_idx
  on public.follows (artist_id, created_at desc)
  where artist_id is not null;
create index if not exists follows_venue_idx
  on public.follows (venue_id, created_at desc)
  where venue_id is not null;

alter table public.follows enable row level security;

drop policy if exists follows_insert_own on public.follows;
create policy follows_insert_own on public.follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()));

drop policy if exists follows_select_own on public.follows;
create policy follows_select_own on public.follows
  for select to authenticated
  using (follower_id = (select auth.uid()));

drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows
  for delete to authenticated
  using (follower_id = (select auth.uid()));

grant select, insert, delete on public.follows to authenticated;

create or replace function public.prevent_self_follow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.artist_id is not null and exists (
    select 1 from public.artists
    where id = new.artist_id and profile_id = new.follower_id
  ) then
    raise exception 'Non puoi seguire la tua scheda artista' using errcode = 'P0001';
  end if;

  if new.venue_id is not null and exists (
    select 1 from public.venues
    where id = new.venue_id and profile_id = new.follower_id
  ) then
    raise exception 'Non puoi seguire la tua scheda locale' using errcode = 'P0001';
  end if;

  return new;
end;
$fn$;

drop trigger if exists follows_no_self on public.follows;
create trigger follows_no_self
  before insert on public.follows
  for each row execute function public.prevent_self_follow();

-- ---------------------------------------------------------------------------
-- Notifica ai follower quando una scheda seguita pubblica una serata
-- ---------------------------------------------------------------------------

create or replace function public.notify_followers_new_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_href text;
  v_body text;
begin
  if new.status <> 'published' or new.starts_at < now() then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  v_href := case
    when new.city is not null and new.slug is not null
      then '/eventi/' || public.slugify(new.city) || '/' || new.slug
    else '/eventi/' || new.id::text
  end;

  v_body := to_char(new.starts_at at time zone new.timezone, 'DD/MM HH24:MI')
    || coalesce(' · ' || new.city, '');

  insert into public.notifications (
    user_id, type, title, body, href, dedupe_key, priority, metadata
  )
  select
    f.follower_id,
    'follow_new_event',
    new.title,
    v_body,
    v_href,
    'follow-event:' || new.id::text,
    'normal',
    jsonb_build_object('eventId', new.id)
  from public.follows f
  left join public.notification_preferences np on np.user_id = f.follower_id
  where (f.artist_id = new.artist_id or f.venue_id = new.venue_id)
    and coalesce(np.in_app_follows, true)
    and (new.created_by is null or f.follower_id <> new.created_by)
  on conflict (user_id, dedupe_key) do nothing;

  return new;
end;
$fn$;

drop trigger if exists events_notify_followers on public.events;
create trigger events_notify_followers
  after insert or update of status, artist_id, venue_id on public.events
  for each row execute function public.notify_followers_new_event();

-- ---------------------------------------------------------------------------
-- Digest: serate salvate + serate degli artisti/locali seguiti
-- ---------------------------------------------------------------------------

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
      when 'en' then E'Your saved nights and the ones from artists and venues you follow this week:\n\n' || d.lines || E'\n\nSee you out there.\nOpenStage'
      else E'Le tue serate salvate e quelle degli artisti e locali che segui questa settimana:\n\n' || d.lines || E'\n\nCi vediamo in giro.\nOpenStage'
    end,
    'digest',
    'digest:' || p.id || ':' || to_char(now(), 'IYYY-IW'),
    jsonb_build_object('events', d.total)
  from public.profiles p
  join public.notification_preferences np on np.user_id = p.id
  cross join lateral (
    select
      string_agg(
        x.title || ' - ' ||
        to_char(x.starts_at at time zone x.timezone, 'DD/MM HH24:MI') ||
        coalesce(' · ' || x.city, ''),
        E'\n'
        order by x.starts_at asc
      ) as lines,
      count(*) as total
    from (
      select e.id, e.title, e.starts_at, e.timezone, e.city
      from public.saved_events se
      join public.events e on e.id = se.event_id
      where se.profile_id = p.id
        and e.status = 'published'
        and e.merged_into is null
        and e.starts_at >= now()
        and e.starts_at < now() + interval '7 days'

      union

      select e.id, e.title, e.starts_at, e.timezone, e.city
      from public.follows f
      join public.events e on (f.artist_id = e.artist_id or f.venue_id = e.venue_id)
      where f.follower_id = p.id
        and e.status = 'published'
        and e.merged_into is null
        and e.starts_at >= now()
        and e.starts_at < now() + interval '7 days'
    ) x
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
  'Mette in coda il digest settimanale opt-in con serate salvate e serate delle schede seguite.';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0053', 'follows')
on conflict (version) do nothing;
