-- ============================================================================
-- OpenStage — Fase 1.3
-- Blocco delle transizioni di ruolo + coerenza del ruolo nella RLS
--
-- Regole:
--   fan -> artist | venue   consentito (una volta sola: poi è irreversibile)
--   artist | venue          nessun cambio, per sempre
--   -> admin                solo tramite settings.admin_email
--   admin (is_admin())      può correggere qualsiasi scelta
--   SQL diretto / service_role  non bloccati (è la via di correzione dell'admin)
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Guardia sul ruolo
--    Le restrizioni valgono solo per le modifiche fatte dall'utente via API
--    (auth.uid() non nullo). SQL diretto dalla dashboard e service_role restano
--    liberi: senza questa distinzione l'admin non potrebbe correggere un errore.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    -- Unica transizione ammessa: fan -> artist | venue.
    if old.role <> 'fan' or new.role not in ('artist', 'venue') then
      new.role := old.role;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Allineamento del profilo admin
--    handle_new_user assegna role = 'admin' all'email in settings.admin_email,
--    ma il precedente trigger annullava quell'update (durante la registrazione
--    auth.uid() è NULL). Ora l'update passa: allineiamo il profilo già esistente.
-- ---------------------------------------------------------------------------
update public.profiles p
set role = 'admin'
where lower(p.email) = (select lower(s.value) from public.settings s where s.key = 'admin_email')
  and p.role <> 'admin';

-- ---------------------------------------------------------------------------
-- 3) RLS — creare una riga artist richiede il ruolo 'artist'
-- ---------------------------------------------------------------------------
drop policy if exists artists_insert_own on public.artists;
create policy artists_insert_own on public.artists
  for insert with check (
    (
      profile_id = (select auth.uid())
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.role = 'artist'
      )
    )
    or (select public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- 4) RLS — creare una riga venue richiede il ruolo 'venue'
-- ---------------------------------------------------------------------------
drop policy if exists venues_insert_own on public.venues;
create policy venues_insert_own on public.venues
  for insert with check (
    (
      profile_id = (select auth.uid())
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.role = 'venue'
      )
    )
    or (select public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- 5) RLS — creare eventi è riservato ad artisti e locali
-- ---------------------------------------------------------------------------
drop policy if exists events_insert_authenticated on public.events;
create policy events_insert_authenticated on public.events
  for insert to authenticated
  with check (
    (
      created_by = (select auth.uid())
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.role in ('artist', 'venue')
      )
    )
    or (select public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- 6) Storico migration
-- ---------------------------------------------------------------------------
insert into supabase_migrations.schema_migrations (version, name) values
  ('0004', 'role_lock')
on conflict (version) do nothing;
