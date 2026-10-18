-- 0014 — Una richiesta in attesa ferma la creazione di altre schede (e si può ritirare)
--
-- Il problema, verificato sul database prima di scrivere:
--
--   richiesta di un locale → 'pending'
--   il richiedente si crea la sua scheda → **riesce**
--   l'admin approva → la scheda appena creata viene **eliminata in silenzio**,
--   con tutto quello che c'era dentro (città, indirizzo, pin, sito). Se quella
--   scheda ha eventi, invece, l'approvazione **fallisce** e l'admin resta fermo.
--
-- Tre regole nuove:
--
-- 1. **Una richiesta in attesa alla volta** per profilo: senza questa, il
--    "blocco" sarebbe un elenco da gestire.
-- 2. **Finché la richiesta è in attesa non si creano schede**: nel database, non
--    solo nel modulo (la RLS da sola darebbe un errore incomprensibile).
-- 3. **Chi ha sbagliato può ritirarla**: `withdraw_claim`, per il richiedente
--    stesso (prima poteva solo l'admin, con `revoke_claim`).
--
-- In più, la scheda di chi aspetta **non viene più eliminata all'invio**: si
-- elimina solo se e quando l'admin approva (`decide_claim`). Prima bastava
-- premere "Richiedi questa scheda" per perdere la propria scheda con i dati
-- dentro, anche se la richiesta veniva poi rifiutata.

-- ---------------------------------------------------------------------------
-- 1. Un esito in più: la richiesta ritirata da chi l'ha fatta
-- ---------------------------------------------------------------------------
alter table public.claims drop constraint if exists claims_status_check;
alter table public.claims add constraint claims_status_check
  check (status = any (array['pending', 'approved', 'rejected', 'revoked', 'withdrawn']));

-- ---------------------------------------------------------------------------
-- 2. Ritiro della propria richiesta
-- ---------------------------------------------------------------------------
create or replace function public.withdraw_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid uuid := auth.uid();
  v_claim public.claims;
begin
  if v_uid is null then
    raise exception 'Serve un accesso per annullare una richiesta' using errcode = '28000';
  end if;

  select * into v_claim from public.claims where id = p_claim_id for update;
  if not found then
    raise exception 'Richiesta inesistente' using errcode = 'P0002';
  end if;

  if v_claim.profile_id <> v_uid then
    raise exception 'Questa richiesta non è tua' using errcode = '42501';
  end if;

  if v_claim.status <> 'pending' then
    raise exception 'Questa richiesta è già stata decisa: non si può più annullare' using errcode = 'P0001';
  end if;

  update public.claims
     set status = 'withdrawn',
         decided_at = now()
   where id = p_claim_id;
end;
$fn$;

revoke all on function public.withdraw_claim(uuid) from public, anon;
grant execute on function public.withdraw_claim(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Richiesta di reclamo di un locale: una alla volta, senza toccare la
--    propria scheda finché non c'è una decisione
-- ---------------------------------------------------------------------------
create or replace function public.request_venue_claim(
  p_venue_id uuid,
  p_proof_url text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid uuid := auth.uid();
  v_titolare uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Serve un accesso per reclamare una scheda' using errcode = '28000';
  end if;

  if btrim(coalesce(p_proof_url, '')) = '' then
    raise exception 'Serve un link pubblico che provi che il locale è tuo' using errcode = '22023';
  end if;

  select profile_id into v_titolare from public.venues where id = p_venue_id;
  if not found then
    raise exception 'Scheda inesistente' using errcode = 'P0002';
  end if;

  if v_titolare is not null then
    if v_titolare = v_uid then
      return null; -- già tuo
    end if;
    raise exception 'Questa scheda è già stata reclamata' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles p
     where p.id = v_uid and p.role in ('venue', 'admin')
  ) then
    raise exception 'Solo un profilo locale può reclamare la scheda di un locale' using errcode = '42501';
  end if;

  -- Una richiesta in attesa alla volta: così il blocco ha un solo caso da
  -- spiegare, e l'account ha una sola riga da mostrare.
  if exists (
    select 1 from public.claims c
     where c.profile_id = v_uid and c.status = 'pending'
  ) then
    raise exception 'Hai già una richiesta in attesa: aspetta la risposta dell''amministratore oppure annullala dal tuo account' using errcode = 'P0001';
  end if;

  -- Se amministra già un'altra scheda **con eventi** non si va avanti: è la
  -- stessa regola di `free_vacant_page`, ma qui si **guarda soltanto**. La
  -- scheda vuota si elimina all'approvazione, non all'invio.
  if exists (
    select 1
      from public.venues v
     where v.profile_id = v_uid
       and v.id <> p_venue_id
       and exists (select 1 from public.events e where e.venue_id = v.id)
  ) then
    raise exception 'Amministri già la scheda di un locale con i tuoi eventi: non puoi prenderne un''altra. Se questa è la tua, chiedi all''amministratore di spostarla' using errcode = 'P0001';
  end if;

  insert into public.claims (subject_type, venue_id, profile_id, status, proof_url)
  values ('venue', p_venue_id, v_uid, 'pending', btrim(p_proof_url))
  returning id into v_id;

  return v_id;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 4. Finché c'è una richiesta in attesa, la scheda non si crea
-- ---------------------------------------------------------------------------
create or replace function public.block_page_with_pending_claim()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  -- Le schede di OpenStage (`profile_id` nullo) non c'entrano niente.
  if new.profile_id is not null
     and exists (
       select 1 from public.claims c
        where c.profile_id = new.profile_id and c.status = 'pending'
     )
  then
    raise exception 'Hai una richiesta in attesa: non puoi creare un''altra scheda finché non c''è una decisione. Aspetta la risposta dell''amministratore oppure annulla la richiesta dal tuo account.' using errcode = 'P0001';
  end if;

  return new;
end;
$fn$;

drop trigger if exists artists_block_pending_claim on public.artists;
create trigger artists_block_pending_claim
  before insert on public.artists
  for each row execute function public.block_page_with_pending_claim();

drop trigger if exists venues_block_pending_claim on public.venues;
create trigger venues_block_pending_claim
  before insert on public.venues
  for each row execute function public.block_page_with_pending_claim();
