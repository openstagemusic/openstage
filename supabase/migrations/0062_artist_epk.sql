-- ============================================================================
-- OpenStage - Fase 11B.1b (EPK artista)
-- Dati editoriali per il press kit: foto, rider tecnico e contatto pubblico.
-- La foto usa lo storage già esistente (`event-covers`), senza nuovi bucket.
-- Nessun gating, nessun pagamento.
--
-- Idempotente.
-- ============================================================================

alter table public.artists
  add column if not exists epk_photo_url text,
  add column if not exists epk_rider text,
  add column if not exists epk_contact text;

alter table public.artists drop constraint if exists artists_epk_check;
alter table public.artists
  add constraint artists_epk_check check (
    (epk_photo_url is null or epk_photo_url ~ '^https://')
    and (epk_rider is null or char_length(epk_rider) <= 4000)
    and (epk_contact is null or char_length(epk_contact) <= 200)
  );

comment on column public.artists.epk_photo_url is
  'Foto per l''EPK, caricata nello storage pubblico esistente.';
comment on column public.artists.epk_rider is
  'Rider tecnico sintetico per l''EPK.';
comment on column public.artists.epk_contact is
  'Contatto pubblico scelto dall''artista per il press kit.';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0062', 'artist_epk')
on conflict (version) do nothing;
