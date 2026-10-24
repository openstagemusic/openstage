-- ============================================================================
-- OpenStage — Fase 5.5E / correzione claim
-- Gli eventi già esistenti non cambiano `created_by` quando un artista o un
-- locale reclama la scheda. Chi amministra la scheda deve però poterli vedere,
-- modificare ed eliminare: il legame con `venue_id` / `artist_id` è la seconda
-- via d'accesso, oltre a `created_by`.
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

drop policy if exists events_select_public on public.events;
create policy events_select_public on public.events
  for select using (
    status in ('published'::public.event_status, 'cancelled'::public.event_status)
    or created_by = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.venues v
      where v.id = events.venue_id and v.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.artists a
      where a.id = events.artist_id and a.profile_id = (select auth.uid())
    )
  );

drop policy if exists events_update_own on public.events;
create policy events_update_own on public.events
  for update using (
    created_by = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.venues v
      where v.id = events.venue_id and v.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.artists a
      where a.id = events.artist_id and a.profile_id = (select auth.uid())
    )
  )
  with check (
    created_by = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.venues v
      where v.id = events.venue_id and v.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.artists a
      where a.id = events.artist_id and a.profile_id = (select auth.uid())
    )
  );

drop policy if exists events_delete_own on public.events;
create policy events_delete_own on public.events
  for delete using (
    created_by = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.venues v
      where v.id = events.venue_id and v.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.artists a
      where a.id = events.artist_id and a.profile_id = (select auth.uid())
    )
  );
