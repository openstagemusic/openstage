-- ============================================================================
-- OpenStage - Fase 10B (link e social delle schede)
-- 1. Ogni scheda artista/locale può mostrare sito e profili social reali.
-- 2. I testi liberi restano nel database, ma gli URL devono essere https.
-- 3. Nessun dato inventato: se un campo è vuoto, l'icona non compare.
--
-- Idempotente.
-- ============================================================================

alter table public.artists
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists tiktok_url text,
  add column if not exists youtube_url text,
  add column if not exists soundcloud_url text,
  add column if not exists bandcamp_url text,
  add column if not exists linktree_url text;

alter table public.venues
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists tiktok_url text,
  add column if not exists youtube_url text,
  add column if not exists soundcloud_url text,
  add column if not exists bandcamp_url text,
  add column if not exists linktree_url text;

-- Un solo controllo per tabella: gli URL sono normalizzati dall'applicazione,
-- qui si impedisce solo che ci finisca testo qualunque o uno schema insicuro.
alter table public.artists drop constraint if exists artists_social_urls_check;
alter table public.artists
  add constraint artists_social_urls_check check (
    (website_url is null or (website_url ~ '^https://' and char_length(website_url) <= 500))
    and (instagram_url is null or (instagram_url ~ '^https://' and char_length(instagram_url) <= 500))
    and (facebook_url is null or (facebook_url ~ '^https://' and char_length(facebook_url) <= 500))
    and (tiktok_url is null or (tiktok_url ~ '^https://' and char_length(tiktok_url) <= 500))
    and (youtube_url is null or (youtube_url ~ '^https://' and char_length(youtube_url) <= 500))
    and (soundcloud_url is null or (soundcloud_url ~ '^https://' and char_length(soundcloud_url) <= 500))
    and (bandcamp_url is null or (bandcamp_url ~ '^https://' and char_length(bandcamp_url) <= 500))
    and (linktree_url is null or (linktree_url ~ '^https://' and char_length(linktree_url) <= 500))
  );

alter table public.venues drop constraint if exists venues_social_urls_check;
alter table public.venues
  add constraint venues_social_urls_check check (
    (website is null or (website ~ '^https?://' and char_length(website) <= 500))
    and (instagram_url is null or (instagram_url ~ '^https://' and char_length(instagram_url) <= 500))
    and (facebook_url is null or (facebook_url ~ '^https://' and char_length(facebook_url) <= 500))
    and (tiktok_url is null or (tiktok_url ~ '^https://' and char_length(tiktok_url) <= 500))
    and (youtube_url is null or (youtube_url ~ '^https://' and char_length(youtube_url) <= 500))
    and (soundcloud_url is null or (soundcloud_url ~ '^https://' and char_length(soundcloud_url) <= 500))
    and (bandcamp_url is null or (bandcamp_url ~ '^https://' and char_length(bandcamp_url) <= 500))
    and (linktree_url is null or (linktree_url ~ '^https://' and char_length(linktree_url) <= 500))
  );

insert into supabase_migrations.schema_migrations (version, name) values
  ('0056', 'profile_social_links')
on conflict (version) do nothing;
