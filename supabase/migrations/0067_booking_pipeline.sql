-- ============================================================================
-- OpenStage - Fase 11B.2b (pipeline booking)
-- Uno stato condiviso per la trattativa, un promemoria e le note private.
-- Tutto gratuito: nessun automatismo, nessuna email, nessun conteggio pubblico.
--
-- Idempotente.
-- ============================================================================

alter table public.booking_threads
  add column if not exists status text not null default 'new',
  add column if not exists reminder_at date;

alter table public.booking_threads drop constraint if exists booking_threads_status_check;
alter table public.booking_threads
  add constraint booking_threads_status_check
  check (status in ('new', 'open', 'confirmed', 'declined', 'archived'));

comment on column public.booking_threads.status is
  'Stato della trattativa: new, open, confirmed, declined, archived.';
comment on column public.booking_threads.reminder_at is
  'Promemoria facoltativo: un giorno in cui rileggere la richiesta.';

-- Note private: le vede solo chi le scrive. Non sono messaggi del thread.
create table if not exists public.booking_notes (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.booking_threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists booking_notes_thread_idx
  on public.booking_notes (thread_id, created_at desc);

alter table public.booking_notes enable row level security;

drop policy if exists booking_notes_select_own on public.booking_notes;
create policy booking_notes_select_own on public.booking_notes
  for select to authenticated
  using (author_id = auth.uid());

drop policy if exists booking_notes_insert_participant on public.booking_notes;
create policy booking_notes_insert_participant on public.booking_notes
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.booking_threads t
      where t.id = booking_notes.thread_id
        and (
          exists (select 1 from public.artists a where a.id = t.artist_id and a.profile_id = auth.uid())
          or exists (select 1 from public.venues v where v.id = t.venue_id and v.profile_id = auth.uid())
        )
    )
  );

drop policy if exists booking_notes_delete_own on public.booking_notes;
create policy booking_notes_delete_own on public.booking_notes
  for delete to authenticated
  using (author_id = auth.uid());

insert into supabase_migrations.schema_migrations (version, name) values
  ('0067', 'booking_pipeline')
on conflict (version) do nothing;
