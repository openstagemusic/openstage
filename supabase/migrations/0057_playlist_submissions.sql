-- ============================================================================
-- OpenStage - Fase 10E (proposte per la playlist)
-- 1. Un artista può proporre UN singolo brano Spotify (non album, artista o
--    playlist): il link è verificato dall'app e il database accetta solo la
--    forma canonica di un track.
-- 2. La proposta arriva nel pannello admin; l'aggiunta alla playlist resta
--    manuale (nessuna API di scrittura, nessun OAuth).
-- 3. `hidden` = scartata, senza cancellare la storia.
--
-- Idempotente.
-- ============================================================================

alter table public.artists
  add column if not exists playlist_track_url text,
  add column if not exists playlist_track_title text,
  add column if not exists playlist_track_status text,
  add column if not exists playlist_track_submitted_at timestamptz,
  add column if not exists playlist_track_added_at timestamptz;

alter table public.artists drop constraint if exists artists_playlist_track_check;
alter table public.artists
  add constraint artists_playlist_track_check check (
    (playlist_track_url is null and playlist_track_status is null)
    or (
      playlist_track_url ~ '^https://open\.spotify\.com/track/[A-Za-z0-9]{22}$'
      and playlist_track_status in ('pending', 'added', 'hidden')
    )
  );

create index if not exists artists_playlist_track_idx
  on public.artists (playlist_track_status, playlist_track_submitted_at desc)
  where playlist_track_url is not null;

comment on column public.artists.playlist_track_url is
  'Brano proposto per la playlist OpenStage. Solo link canonico a un track Spotify.';
comment on column public.artists.playlist_track_status is
  'pending = da valutare, added = entrata in playlist, hidden = scartata.';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0057', 'playlist_submissions')
on conflict (version) do nothing;
