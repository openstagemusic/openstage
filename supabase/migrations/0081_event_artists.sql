-- ============================================================================
-- OpenStage - Multi-artista: la tabella della lineup
--
-- Una serata ha una lineup, non un artista solo. La verità sta in
-- `event_artists`; `events.artist_id` resta come **artista principale** perché
-- widget, EPK e ricerche esistenti lo leggono, ma non è più l'unico.
--
-- Regola dei permessi: la lineup la gestisce chi gestisce la serata (chi l'ha
-- creata, il locale proprietario, l'admin). L'artista collegato **non** è
-- proprietario: prima poteva modificare la serata perché la RLS lo considerava
-- tale, ed era sbagliato.
--
-- Retrocompatibile: ogni evento con `artist_id` riceve la sua riga a
-- `position = 0`.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.event_artists (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  artist_id   uuid references public.artists (id) on delete restrict,
  artist_name text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint event_artists_one_of check (
    (artist_id is null) <> (artist_name is null)
  )
);

-- Un artista (con scheda) compare una volta sola nella stessa lineup.
create unique index if not exists event_artists_event_artist_key
  on public.event_artists (event_id, artist_id)
  where artist_id is not null;

create index if not exists event_artists_event_idx
  on public.event_artists (event_id, position);

create index if not exists event_artists_artist_idx
  on public.event_artists (artist_id);

-- ---------------------------------------------------------------------------
-- Backfill: l'artista principale diventa la prima riga della lineup.
-- ---------------------------------------------------------------------------

insert into public.event_artists (event_id, artist_id, position)
select id, artist_id, 0
  from public.events
 where artist_id is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.event_artists enable row level security;

drop policy if exists event_artists_read on public.event_artists;
create policy event_artists_read on public.event_artists
  for select using (true);

drop policy if exists event_artists_write on public.event_artists;
create policy event_artists_write on public.event_artists
  for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_artists.event_id
        and (
          e.created_by = (select auth.uid())
          or (select public.is_admin())
          or exists (
            select 1 from public.venues v
            where v.id = e.venue_id and v.profile_id = (select auth.uid())
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_artists.event_id
        and (
          e.created_by = (select auth.uid())
          or (select public.is_admin())
          or exists (
            select 1 from public.venues v
            where v.id = e.venue_id and v.profile_id = (select auth.uid())
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- La serata la amministra chi l'ha creata, il locale proprietario e l'admin.
-- Non più l'artista collegato: stare in lineup non è amministrare.
-- ---------------------------------------------------------------------------

drop policy if exists events_update_own on public.events;
create policy events_update_own on public.events
  for update using (
    created_by = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.venues v
      where v.id = events.venue_id and v.profile_id = (select auth.uid())
    )
  )
  with check (
    created_by = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.venues v
      where v.id = events.venue_id and v.profile_id = (select auth.uid())
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
  );

insert into supabase_migrations.schema_migrations (version, name) values
  ('0081', 'event_artists')
on conflict (version) do nothing;
