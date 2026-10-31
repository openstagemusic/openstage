-- ============================================================================
-- OpenStage - Fase 12.1 (locale chiuso)
-- Un locale può chiudere: le serate future si annullano (restano leggibili),
-- la scheda lo dice, il contatto si spegne. Riaprire è possibile: non si
-- cancella nulla.
--
-- Idempotente.
-- ============================================================================

alter table public.venues
  add column if not exists closed_at timestamptz,
  add column if not exists closed_note text;

alter table public.venues drop constraint if exists venues_closed_note_check;
alter table public.venues
  add constraint venues_closed_note_check
  check (closed_note is null or char_length(closed_note) <= 280);

comment on column public.venues.closed_at is
  'Quando il locale ha chiuso. NULL = locale aperto.';
comment on column public.venues.closed_note is
  'Nota pubblica sulla chiusura (facoltativa, max 280 caratteri).';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0068', 'venue_closed')
on conflict (version) do nothing;
