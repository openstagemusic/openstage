-- ============================================================================
-- OpenStage — Fase 2 (Homepage Discovery)
-- Artisti non ancora registrati: rende nullable artists.profile_id.
--
-- Perché: la piattaforma esiste per dare visibilità agli artisti che non sono
-- su nessuna piattaforma. Un evento reale può avere un artista che non ha
-- ancora creato un account: la riga artista viene inserita dallo staff
-- (profile_id null = "non rivendicato") e potrà essere rivendicata in futuro.
--
-- Simmetrico a venues.profile_id (già nullable) e a events.is_unclaimed.
--
-- Sicurezza: le policy RLS non cambiano. artists_insert_own richiede
-- profile_id = auth.uid(), quindi un utente normale NON può creare righe
-- non rivendicate; solo staff/admin (is_admin()) può.
-- Nessun dato finto: le righe esistono solo quando un evento reale le richiede.
-- ============================================================================

alter table public.artists alter column profile_id drop not null;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0007', 'artists_unclaimed')
on conflict (version) do nothing;
