-- ============================================================================
-- OpenStage - Fase 13 (cancellazione account)
-- Cancellare un account non deve portarsi via i dati di altre persone.
-- Le schede restano (tornano non reclamate), le conversazioni restano con
-- "Account eliminato" al posto del mittente, le serate restano online.
--
-- Idempotente.
-- ============================================================================

-- La scheda artista sopravvive: l'eliminazione del profilo la lascia orfana.
alter table public.artists drop constraint if exists artists_profile_id_fkey;
alter table public.artists
  add constraint artists_profile_id_fkey
  foreign key (profile_id) references public.profiles (id) on delete set null;

-- Il locale era già "set null": lo rendiamo esplicito per chi legge lo schema.
alter table public.venues drop constraint if exists venues_profile_id_fkey;
alter table public.venues
  add constraint venues_profile_id_fkey
  foreign key (profile_id) references public.profiles (id) on delete set null;

-- I thread restano: l'altra parte non perde la conversazione.
alter table public.booking_threads alter column created_by drop not null;
alter table public.booking_threads drop constraint if exists booking_threads_created_by_fkey;
alter table public.booking_threads
  add constraint booking_threads_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

-- I messaggi restano; senza mittente diventano "Account eliminato".
alter table public.booking_messages alter column sender_id drop not null;
alter table public.booking_messages drop constraint if exists booking_messages_sender_id_fkey;
alter table public.booking_messages
  add constraint booking_messages_sender_id_fkey
  foreign key (sender_id) references public.profiles (id) on delete set null;

comment on constraint artists_profile_id_fkey on public.artists is
  'Alla cancellazione dell''account la scheda resta, non reclamata.';
comment on constraint booking_threads_created_by_fkey on public.booking_threads is
  'Alla cancellazione dell''account il thread resta per l''altra parte.';
comment on constraint booking_messages_sender_id_fkey on public.booking_messages is
  'Alla cancellazione dell''account il messaggio resta, senza mittente.';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0072', 'account_deletion')
on conflict (version) do nothing;
