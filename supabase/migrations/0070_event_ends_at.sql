-- ============================================================================
-- OpenStage - Fase 12.3 (festival multi-giorno)
-- Solo un intervallo di date: nessuna ricorrenza automatica, nessuna serie.
-- `ends_at` è la data di fine (giorno), non un orario.
--
-- Idempotente.
-- ============================================================================

alter table public.events
  add column if not exists ends_at date;

alter table public.events drop constraint if exists events_ends_after_start;
alter table public.events
  add constraint events_ends_after_start
  check (ends_at is null or ends_at >= (starts_at at time zone 'UTC')::date);

comment on column public.events.ends_at is
  'Ultimo giorno della serata (festival). NULL = serata di un solo giorno.';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0070', 'event_ends_at')
on conflict (version) do nothing;
