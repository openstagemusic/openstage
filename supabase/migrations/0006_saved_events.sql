-- ============================================================================
-- OpenStage — Fase 2.1 (Homepage Discovery)
-- Eventi salvati dal profilo: il pulsante "Salva" del pop-up scrive qui.
--
-- Nessun dato finto: se la tabella è vuota l'utente semplicemente non ha
-- ancora salvato nulla.
-- ============================================================================

create table if not exists public.saved_events (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, event_id)
);

create index if not exists saved_events_event_idx on public.saved_events (event_id);

alter table public.saved_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_events' and policyname = 'saved_events_select_own') then
    create policy saved_events_select_own on public.saved_events
      for select using (profile_id = (select auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_events' and policyname = 'saved_events_insert_own') then
    create policy saved_events_insert_own on public.saved_events
      for insert with check (profile_id = (select auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_events' and policyname = 'saved_events_delete_own') then
    create policy saved_events_delete_own on public.saved_events
      for delete using (profile_id = (select auth.uid()));
  end if;
end $$;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0006', 'saved_events')
on conflict (version) do nothing;
