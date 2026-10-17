-- ---------------------------------------------------------------------------
-- 0012 — Reclamo: ruolo admin e sostituzione della scheda creata per errore
--
-- La prova dell'utente ha trovato tre difetti che stanno insieme:
--
-- 1. Il percorso "divento artista" crea subito una scheda nuova. Chi poi prova
--    a reclamare la scheda che esiste già si trova bloccato dalla regola
--    "un profilo amministra una scheda sola" — con un vicolo cieco e nessuna
--    via d'uscita. Qui la regola viene **completata**: se la scheda che
--    amministri è vuota (nessun evento, profilo non verificato) e ne reclami
--    un'altra, la prima viene eliminata e prendi quella. Se invece ha eventi,
--    il reclamo si rifiuta spiegando perché.
-- 2. L'interfaccia diceva all'admin che poteva gestire le schede, il database
--    lo rifiutava (pretendeva `role = 'artist'`): due verità in contraddizione.
--    Ora le funzioni accettano anche l'admin, come già fanno `is_admin()`,
--    la moderazione e le policy.
-- 3. `claims` non viene toccata: le funzioni restano l'unica porta.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Libera la scheda vuota di un profilo prima di assegnargliene un'altra.
--
-- Risponde:
--   'nessuna'    → il profilo non ha altre schede di quel tipo;
--   'eliminata'  → la scheda era vuota (nessun evento) ed è stata eliminata;
--   'occupata'   → la scheda ha eventi: non si tocca, decide l'admin.
--
-- Non è una funzione da chiamare dall'esterno: l'esecuzione è tolta a tutti
-- (`revoke … from public, anon, authenticated` — Supabase concede l'esecuzione
-- per impostazione predefinita, quindi la revoca da PUBLIC da sola non basta).
-- La usano solo le funzioni di reclamo, che girano con i permessi del
-- proprietario.
-- ---------------------------------------------------------------------------
create or replace function public.free_vacant_page(
  p_kind text,
  p_profile_id uuid,
  p_keep_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_own uuid;
  v_eventi integer;
begin
  if p_kind = 'artist' then
    select a.id into v_own
      from public.artists a
     where a.profile_id = p_profile_id
       and (p_keep_id is null or a.id <> p_keep_id)
     limit 1;
  else
    select v.id into v_own
      from public.venues v
     where v.profile_id = p_profile_id
       and (p_keep_id is null or v.id <> p_keep_id)
     limit 1;
  end if;

  if v_own is null then
    return 'nessuna';
  end if;

  if p_kind = 'artist' then
    select count(*) into v_eventi from public.events e where e.artist_id = v_own;
  else
    select count(*) into v_eventi from public.events e where e.venue_id = v_own;
  end if;

  -- Una scheda con eventi non si tocca: si perde troppo, e la decisione torna
  -- all'admin. Una scheda senza eventi è una scheda che nessuno usa (o creata
  -- per errore un minuto fa): sostituirla non toglie niente a nessuno. La
  -- verifica è del profilo, non della scheda, quindi resta dov'è.
  if v_eventi > 0 then
    return 'occupata';
  end if;

  if p_kind = 'artist' then
    delete from public.artists where id = v_own;
  else
    delete from public.venues where id = v_own;
  end if;

  return 'eliminata';
end;
$fn$;

revoke all on function public.free_vacant_page(text, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reclamo immediato di una scheda artista (ora aperto anche all'admin)
-- ---------------------------------------------------------------------------
create or replace function public.claim_artist(
  p_artist_id uuid,
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
  v_libero text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Serve un accesso per reclamare una scheda' using errcode = '28000';
  end if;

  if btrim(coalesce(p_proof_url, '')) = '' then
    raise exception 'Serve un link pubblico che provi che la scheda è tua' using errcode = '22023';
  end if;

  select profile_id into v_titolare from public.artists where id = p_artist_id;
  if not found then
    raise exception 'Scheda inesistente' using errcode = 'P0002';
  end if;

  if v_titolare is not null then
    if v_titolare = v_uid then
      return null; -- già tua: niente da fare, non è un errore
    end if;
    raise exception 'Questa scheda è già stata reclamata' using errcode = 'P0001';
  end if;

  -- L'admin è il superutente della piattaforma: l'interfaccia gli mostra il
  -- pannello, il database non deve essere l'unico a dire di no.
  if not exists (
    select 1 from public.profiles p
     where p.id = v_uid and p.role in ('artist', 'admin')
  ) then
    raise exception 'Solo un profilo artista può reclamare una scheda artista' using errcode = '42501';
  end if;

  -- Una scheda sola per profilo (vincolo `artists_profile_id_key`, dalla
  -- Fase 1). Se quella che amministra è vuota — creata per errore un minuto
  -- fa — si elimina e si prende questa. Se ha eventi, no.
  v_libero := public.free_vacant_page('artist', v_uid, p_artist_id);

  if v_libero = 'occupata' then
    raise exception 'Hai già una scheda artista con i tuoi eventi: non puoi prenderne un''altra. Se questa è la tua, chiedi all''amministratore di spostarla' using errcode = 'P0001';
  end if;

  update public.artists set profile_id = v_uid where id = p_artist_id;

  insert into public.claims (subject_type, artist_id, profile_id, status, proof_url, decided_at)
  values ('artist', p_artist_id, v_uid, 'approved', btrim(p_proof_url), now())
  returning id into v_id;

  return v_id;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Richiesta di reclamo di un locale (la decide un admin)
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
  v_libero text;
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

  v_libero := public.free_vacant_page('venue', v_uid, p_venue_id);

  if v_libero = 'occupata' then
    raise exception 'Amministri già la scheda di un locale con i tuoi eventi: non puoi prenderne un''altra. Se questa è la tua, chiedi all''amministratore di spostarla' using errcode = 'P0001';
  end if;

  insert into public.claims (subject_type, venue_id, profile_id, status, proof_url)
  values ('venue', p_venue_id, v_uid, 'pending', btrim(p_proof_url))
  returning id into v_id;

  return v_id;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Decisione dell'admin
--
-- Approvare equivale a verificare. Resta la regola "una scheda per profilo",
-- con la stessa eccezione: se chi ha chiesto la scheda ne amministra una vuota,
-- quella si elimina; se ha eventi, l'approvazione si rifiuta spiegando perché.
-- ---------------------------------------------------------------------------
create or replace function public.decide_claim(
  p_claim_id uuid,
  p_approva boolean,
  p_nota text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_claim public.claims;
  v_titolare uuid;
  v_soggetto uuid;
  v_libero text;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può decidere una richiesta' using errcode = '42501';
  end if;

  select * into v_claim from public.claims where id = p_claim_id for update;
  if not found then
    raise exception 'Richiesta inesistente' using errcode = 'P0002';
  end if;
  if v_claim.status <> 'pending' then
    raise exception 'Questa richiesta è già stata decisa' using errcode = 'P0001';
  end if;

  v_soggetto := coalesce(v_claim.artist_id, v_claim.venue_id);

  if not p_approva then
    update public.claims
       set status = 'rejected',
           decided_at = now(),
           decided_by = v_admin,
           note = coalesce(p_nota, note)
     where id = p_claim_id;
    return;
  end if;

  if v_claim.subject_type = 'artist' then
    select profile_id into v_titolare from public.artists where id = v_claim.artist_id for update;
    if v_titolare is not null and v_titolare <> v_claim.profile_id then
      raise exception 'La scheda è già stata reclamata da altri' using errcode = 'P0001';
    end if;

    -- Chi ha chiesto la scheda potrebbe essersene creata una nel frattempo.
    v_libero := public.free_vacant_page('artist', v_claim.profile_id, v_claim.artist_id);
    if v_libero = 'occupata' then
      raise exception 'Chi ha chiesto la scheda amministra già una scheda artista con i suoi eventi' using errcode = 'P0001';
    end if;

    update public.artists set profile_id = v_claim.profile_id where id = v_claim.artist_id;
  else
    select profile_id into v_titolare from public.venues where id = v_claim.venue_id for update;
    if v_titolare is not null and v_titolare <> v_claim.profile_id then
      raise exception 'La scheda è già stata reclamata da altri' using errcode = 'P0001';
    end if;

    v_libero := public.free_vacant_page('venue', v_claim.profile_id, v_claim.venue_id);
    if v_libero = 'occupata' then
      raise exception 'Chi ha chiesto la scheda amministra già la scheda di un locale con i suoi eventi' using errcode = 'P0001';
    end if;

    update public.venues set profile_id = v_claim.profile_id where id = v_claim.venue_id;
  end if;

  update public.claims
     set status = 'approved',
         decided_at = now(),
         decided_by = v_admin,
         note = coalesce(p_nota, note)
   where id = p_claim_id;

  update public.profiles
     set verified_at = coalesce(verified_at, now())
   where id = v_claim.profile_id;

  update public.claims
     set status = 'rejected',
         decided_at = now(),
         decided_by = v_admin,
         note = 'Scheda già assegnata'
   where status = 'pending'
     and id <> p_claim_id
     and coalesce(artist_id, venue_id) = v_soggetto;
end;
$fn$;
