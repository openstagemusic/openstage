-- ============================================================================
-- OpenStage — Fase 2.1 (Homepage Discovery)
-- Colonne, vincoli e indici per il globo degli eventi e la ricerca.
--
-- Solo aggiunte: nessuna policy toccata (la visibilità pubblica resta
-- `events_select_public`, che mostra al pubblico i soli eventi pubblicati).
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tipi
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'event_kind') then
    create type public.event_kind as enum
      ('concert', 'dj_set', 'festival', 'open_mic', 'acoustic', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'location_precision') then
    create type public.location_precision as enum ('exact', 'approximate');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Colonne evento
--    `latitude`/`longitude` restano nullabili: un evento senza posizione non
--    finisce sulla mappa ma resta valido (e visibile in elenco).
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_precision public.location_precision not null default 'exact',
  add column if not exists area_radius_m integer,
  add column if not exists genre text,
  add column if not exists kind public.event_kind not null default 'concert',
  add column if not exists is_free boolean not null default false,
  add column if not exists ticket_url text,
  add column if not exists cover_image_url text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_until timestamptz,
  add column if not exists timezone text not null default 'Europe/Rome';

-- ---------------------------------------------------------------------------
-- 3) Vincoli di coerenza
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_geo_check') then
    alter table public.events
      add constraint events_geo_check check (
        (latitude is null and longitude is null)
        or (latitude between -90 and 90 and longitude between -180 and 180)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_area_check') then
    alter table public.events
      add constraint events_area_check check (
        (location_precision = 'exact' and area_radius_m is null)
        or (location_precision = 'approximate' and area_radius_m between 100 and 50000)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_timezone_check') then
    alter table public.events
      add constraint events_timezone_check check (timezone ~ '^[A-Za-z]+/[A-Za-z_+/=-]+$');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Indici per il globo e gli elenchi
--    Parziali su `status = 'published'`: la query pubblica filtra sempre così.
-- ---------------------------------------------------------------------------
create index if not exists events_published_starts_at_idx
  on public.events (starts_at) where status = 'published';

create index if not exists events_published_geo_idx
  on public.events (latitude, longitude)
  where status = 'published' and latitude is not null;

create index if not exists events_featured_idx
  on public.events (starts_at)
  where status = 'published' and is_featured;

-- ---------------------------------------------------------------------------
-- 5) Ricerca con refusi e accenti (suggerimenti live)
--    pg_trgm sta nello schema `extensions`, già nel search_path del database.
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;

create index if not exists artists_name_trgm_idx
  on public.artists using gin (name extensions.gin_trgm_ops);

create index if not exists venues_name_trgm_idx
  on public.venues using gin (name extensions.gin_trgm_ops);

create index if not exists events_title_trgm_idx
  on public.events using gin (title extensions.gin_trgm_ops);

create index if not exists events_city_trgm_idx
  on public.events using gin (city extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 6) Storico migration
-- ---------------------------------------------------------------------------
insert into supabase_migrations.schema_migrations (version, name) values
  ('0005', 'events_discovery')
on conflict (version) do nothing;
