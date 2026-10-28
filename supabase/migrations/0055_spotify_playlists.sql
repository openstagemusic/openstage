-- ============================================================================
-- OpenStage - Fase 10A (Spotify)
-- 1. Tabella `spotify_playlists`: playlist editoriali reali, lette da tutti ma
--    scritte solo dall'admin. Nessun contenuto inventato: se è vuota, il dock
--    resta spento e la pagina mostra uno stato vuoto onesto.
-- 2. I link salvati devono essere Spotify canonici (controllo nel database,
--    oltre alla validazione applicativa).
-- 3. I link Spotify degli artisti sono accettati solo nella forma canonica.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.spotify_playlists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  url text not null,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spotify_playlists_url_check check (
    url ~ '^https://open\.spotify\.com/playlist/[A-Za-z0-9]{22}$'
  )
);

create index if not exists spotify_playlists_published_idx
  on public.spotify_playlists (published, sort_order);

alter table public.spotify_playlists enable row level security;

drop policy if exists spotify_playlists_select_public on public.spotify_playlists;
create policy spotify_playlists_select_public on public.spotify_playlists
  for select using (published or public.is_admin());

drop policy if exists spotify_playlists_admin_insert on public.spotify_playlists;
create policy spotify_playlists_admin_insert on public.spotify_playlists
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists spotify_playlists_admin_update on public.spotify_playlists;
create policy spotify_playlists_admin_update on public.spotify_playlists
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists spotify_playlists_admin_delete on public.spotify_playlists;
create policy spotify_playlists_admin_delete on public.spotify_playlists
  for delete to authenticated
  using (public.is_admin());

grant select on public.spotify_playlists to anon, authenticated;
grant insert, update, delete on public.spotify_playlists to authenticated;

drop trigger if exists spotify_playlists_touch on public.spotify_playlists;
create trigger spotify_playlists_touch
  before update on public.spotify_playlists
  for each row execute function public.touch_updated_at();

comment on table public.spotify_playlists is
  'Playlist Spotify reali della redazione. Lettura pubblica delle sole pubblicate; scrittura solo admin.';

-- ---------------------------------------------------------------------------
-- Il link Spotify di un artista, se c'è, deve essere canonico.
-- La validazione applicativa lo normalizza prima del salvataggio.
-- ---------------------------------------------------------------------------

alter table public.artists drop constraint if exists artists_spotify_url_check;
alter table public.artists
  add constraint artists_spotify_url_check check (
    spotify_url is null
    or spotify_url ~ '^https://open\.spotify\.com/(artist|album|track|playlist)/[A-Za-z0-9]{22}$'
  );

insert into supabase_migrations.schema_migrations (version, name) values
  ('0055', 'spotify_playlists')
on conflict (version) do nothing;
