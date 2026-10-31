-- ============================================================================
-- OpenStage - Fase 11B.2 (aggregati per il proprietario)
-- Due letture che la RLS non può concedere senza esporre righe altrui:
-- l'andamento dei follower e il numero di salvataggi dei propri eventi.
-- Restituiscono solo numeri, mai l'identità di chi segue o salva.
--
-- Idempotente.
-- ============================================================================

-- Andamento follower: totale cumulato giorno per giorno. `p_kind` è
-- 'artist' oppure 'venue'. Se la scheda non è di chi chiama, non torna nulla.
create or replace function public.owner_follow_series(
  p_kind text,
  p_id uuid,
  p_days integer default 30
)
returns table (day date, total integer)
language sql
security definer
set search_path = public
stable
as $$
  with allowed as (
    select 1
    where
      (p_kind = 'artist' and exists (
        select 1 from public.artists a where a.id = p_id and a.profile_id = auth.uid()
      ))
      or (p_kind = 'venue' and exists (
        select 1 from public.venues v where v.id = p_id and v.profile_id = auth.uid()
      ))
      or public.is_admin()
  ),
  span as (
    select generate_series(
      ((now() at time zone 'utc')::date - (least(greatest(p_days, 1), 365) - 1)),
      (now() at time zone 'utc')::date,
      interval '1 day'
    )::date as day
  ),
  start_day as (
    select min(day) as day from span
  ),
  base as (
    select count(*)::integer as n
    from public.follows f
    where (
        (p_kind = 'artist' and f.artist_id = p_id)
        or (p_kind = 'venue' and f.venue_id = p_id)
      )
      and f.created_at < (select day from start_day)::timestamptz
  ),
  daily as (
    select s.day, count(f.id)::integer as n
    from span s
    left join public.follows f
      on (
        (p_kind = 'artist' and f.artist_id = p_id)
        or (p_kind = 'venue' and f.venue_id = p_id)
      )
      and f.created_at >= s.day::timestamptz
      and f.created_at < (s.day + 1)::timestamptz
    group by s.day
  )
  select
    d.day,
    (select n from base) + sum(d.n) over (order by d.day) as total
  from daily d
  where exists (select 1 from allowed)
  order by d.day;
$$;

-- Salvataggi per evento: solo i propri eventi, solo il totale.
create or replace function public.owner_event_saves(p_profile uuid)
returns table (event_id uuid, saves integer)
language sql
security definer
set search_path = public
stable
as $$
  select e.id as event_id, count(s.profile_id)::integer as saves
  from public.events e
  left join public.saved_events s on s.event_id = e.id
  where e.created_by = p_profile
    and (p_profile = auth.uid() or public.is_admin())
  group by e.id;
$$;

revoke all on function public.owner_follow_series(text, uuid, integer) from public;
revoke all on function public.owner_event_saves(uuid) from public;
grant execute on function public.owner_follow_series(text, uuid, integer) to authenticated;
grant execute on function public.owner_event_saves(uuid) to authenticated;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0065', 'owner_analytics')
on conflict (version) do nothing;
