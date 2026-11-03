-- ============================================================================
-- OpenStage - Salvataggi anche per le serate in lineup e per i locali
--
-- `owner_event_saves` contava solo gli eventi con `created_by = profilo`. Così
-- un artista in lineup su una serata creata da altri vedeva 0 salvataggi, e un
-- locale reclamato non vedeva quelli delle serate collegate.
--
-- Ora conta se il profilo:
--   - ha creato la serata, oppure
--   - possiede il locale della serata, oppure
--   - è in lineup (scheda artista collegata).
--
-- Il controllo di autorizzazione resta: si vedono solo i propri numeri, o tutti
-- se admin.
--
-- Idempotente.
-- ============================================================================

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
  where (p_profile = auth.uid() or public.is_admin())
    and (
      e.created_by = p_profile
      or exists (
        select 1 from public.venues v
        where v.id = e.venue_id and v.profile_id = p_profile
      )
      or exists (
        select 1
          from public.event_artists ea
          join public.artists a on a.id = ea.artist_id
         where ea.event_id = e.id and a.profile_id = p_profile
      )
    )
  group by e.id;
$$;

revoke all on function public.owner_event_saves(uuid) from public;
grant execute on function public.owner_event_saves(uuid) to authenticated;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0089', 'owner_event_saves_lineup')
on conflict (version) do nothing;
