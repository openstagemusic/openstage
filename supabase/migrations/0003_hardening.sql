-- ============================================================================
-- OpenStage — Fase 1.2
-- Hardening del database (interventi derivati dagli advisor Supabase)
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) search_path fisso su touch_updated_at
--    (advisor: function_search_path_mutable)
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Le funzioni trigger non devono essere chiamabili dall'API REST
--    (advisor: anon/authenticated_security_definer_function_executable)
--
--    I trigger non controllano EXECUTE a runtime (il privilegio è verificato
--    alla CREATE TRIGGER), quindi la revoca è sicura: verificata con test reale
--    su auth.users dopo l'applicazione.
--
--    is_admin() NON viene revocata di proposito: le policy RLS la invocano.
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_role_escalation() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Indici sulle foreign key di events
--    (advisor: unindexed_foreign_keys)
--    Servono a mappa/lista: filtro per artista, locale e autore dell'evento.
-- ---------------------------------------------------------------------------
create index if not exists events_artist_id_idx on public.events (artist_id);
create index if not exists events_venue_id_idx on public.events (venue_id);
create index if not exists events_created_by_idx on public.events (created_by);

-- ---------------------------------------------------------------------------
-- 4) Policy RLS
--    - auth.uid()/is_admin() dentro (select ...): valutati una volta per query
--      invece che per riga (advisor: auth_rls_initplan)
--    - profiles: coppie admin+own fuse in una sola policy
--      (advisor: multiple_permissive_policies)
--    Semantica invariata.
-- ---------------------------------------------------------------------------

-- settings — admin only
drop policy if exists settings_select_admin on public.settings;
create policy settings_select_admin on public.settings
  for select using ((select public.is_admin()));

drop policy if exists settings_update_admin on public.settings;
create policy settings_update_admin on public.settings
  for update using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- profiles — own row, or admin
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select using ((select auth.uid()) = id or (select public.is_admin()));

drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
  for update using ((select auth.uid()) = id or (select public.is_admin()))
  with check ((select auth.uid()) = id or (select public.is_admin()));

-- artists — public read, owners write
drop policy if exists artists_select_public on public.artists;
create policy artists_select_public on public.artists
  for select using (true);

drop policy if exists artists_insert_own on public.artists;
create policy artists_insert_own on public.artists
  for insert with check ((select auth.uid()) = profile_id);

drop policy if exists artists_update_own on public.artists;
create policy artists_update_own on public.artists
  for update using ((select auth.uid()) = profile_id or (select public.is_admin()))
  with check ((select auth.uid()) = profile_id or (select public.is_admin()));

drop policy if exists artists_delete_own on public.artists;
create policy artists_delete_own on public.artists
  for delete using ((select auth.uid()) = profile_id or (select public.is_admin()));

-- venues — public read, owners write
drop policy if exists venues_select_public on public.venues;
create policy venues_select_public on public.venues
  for select using (true);

drop policy if exists venues_insert_own on public.venues;
create policy venues_insert_own on public.venues
  for insert with check ((select auth.uid()) = profile_id);

drop policy if exists venues_update_own on public.venues;
create policy venues_update_own on public.venues
  for update using ((select auth.uid()) = profile_id or (select public.is_admin()))
  with check ((select auth.uid()) = profile_id or (select public.is_admin()));

drop policy if exists venues_delete_own on public.venues;
create policy venues_delete_own on public.venues
  for delete using ((select auth.uid()) = profile_id or (select public.is_admin()));

-- events — published are public, drafts stay with their creator
drop policy if exists events_select_public on public.events;
create policy events_select_public on public.events
  for select using (
    status = 'published'
    or created_by = (select auth.uid())
    or (select public.is_admin())
  );

drop policy if exists events_insert_authenticated on public.events;
create policy events_insert_authenticated on public.events
  for insert to authenticated
  with check (created_by = (select auth.uid()) or (select public.is_admin()));

drop policy if exists events_update_own on public.events;
create policy events_update_own on public.events
  for update using (created_by = (select auth.uid()) or (select public.is_admin()))
  with check (created_by = (select auth.uid()) or (select public.is_admin()));

drop policy if exists events_delete_own on public.events;
create policy events_delete_own on public.events
  for delete using (created_by = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 5) Storico migration (schema canonico della CLI Supabase)
--    Il progetto è nato applicando SQL a mano, quindi la history non esisteva.
--    La creiamo e registriamo le migration già applicate: la versione è il
--    prefisso del file (0001_init.sql -> 0001), come fa la CLI.
-- ---------------------------------------------------------------------------
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key
);
alter table supabase_migrations.schema_migrations add column if not exists statements text[];
alter table supabase_migrations.schema_migrations add column if not exists name text;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0001', 'init'),
  ('0002', 'role_self_service'),
  ('0003', 'hardening')
on conflict (version) do nothing;
