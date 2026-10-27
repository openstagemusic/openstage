-- ============================================================================
-- OpenStage - Fase 8.9 (backup del database)
-- Bucket privato per le copie cifrate del database.
--
-- Perche' privato: dentro ci sono dump completi, quindi nessuna lettura
-- pubblica. Non creiamo policy per anon/authenticated: scrive e legge solo la
-- service role, usata dal workflow GitHub Actions e dall'admin per il ripristino.
--
-- Il bucket NON sostituisce un backup fuori da Supabase: se il progetto viene
-- eliminato, sparisce anche il bucket. Il workflow salva una seconda copia
-- come artifact GitHub.
--
-- Idempotente.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0051', 'backup_bucket')
on conflict (version) do nothing;
