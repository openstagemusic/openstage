-- ============================================================================
-- OpenStage - Fase 11B.1c (immagini profilo e banner)
-- Avatar e banner per artisti e locali. Le immagini usano lo storage pubblico
-- già esistente (`event-covers`), con la cartella del profilo.
-- Nessun costo nuovo, nessun gating.
--
-- Idempotente.
-- ============================================================================

alter table public.artists
  add column if not exists avatar_url text,
  add column if not exists banner_url text;

alter table public.venues
  add column if not exists avatar_url text,
  add column if not exists banner_url text;

alter table public.artists drop constraint if exists artists_images_check;
alter table public.artists
  add constraint artists_images_check check (
    (avatar_url is null or avatar_url ~ '^https://')
    and (banner_url is null or banner_url ~ '^https://')
  );

alter table public.venues drop constraint if exists venues_images_check;
alter table public.venues
  add constraint venues_images_check check (
    (avatar_url is null or avatar_url ~ '^https://')
    and (banner_url is null or banner_url ~ '^https://')
  );

comment on column public.artists.avatar_url is
  'Immagine profilo pubblica dell''artista.';
comment on column public.artists.banner_url is
  'Banner pubblico della scheda artista.';
comment on column public.venues.avatar_url is
  'Immagine profilo pubblica del locale.';
comment on column public.venues.banner_url is
  'Banner pubblico della scheda locale.';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0063', 'profile_images')
on conflict (version) do nothing;
