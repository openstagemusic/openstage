-- 0011 — Il passaggio di consegne: reclamare una scheda, e chi può pubblicare.
--
-- Una scheda di artista o locale nasce dagli eventi reali ed è "di OpenStage"
-- finché qualcuno non la reclama. Questo blocco costruisce quel passaggio e la
-- fiducia che lo rende sicuro.
--
-- Due regole guidano tutto:
--
--   1. Reclamare non è una scrittura come le altre. La RLS di `artists` e
--      `venues` permette di modificare solo ciò che è già tuo (`profile_id =
--      auth.uid()`), quindi una scheda con `profile_id` vuoto **non è
--      reclamabile** con un UPDATE: il database lo respinge. Tutte le
--      transizioni passano da funzioni controllate, così il reclamo è un atto
--      esplicito e tracciato.
--
--   2. Chi non è verificato può lavorare, ma non pubblicare. La verifica
--      (`profiles.verified_at`) non è un badge decorativo: è il permesso di
--      pubblicare eventi. Il reclamo dell'artista resta immediato (l'artista
--      vero non aspetta un moderatore), ma finché un admin non lo verifica i
--      suoi eventi nascono in bozza.

-- ---------------------------------------------------------------------------
-- La richiesta di reclamo
-- ---------------------------------------------------------------------------
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('artist', 'venue')),
  artist_id uuid references public.artists (id) on delete cascade,
  venue_id uuid references public.venues (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'revoked')),
  -- Obbligatorio: senza una prova pubblica il reclamo non è verificabile.
  proof_url text not null check (btrim(proof_url) <> ''),
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id),
  -- Una richiesta riguarda un artista **oppure** un locale, mai entrambi.
  constraint claims_soggetto_coerente check (
    (subject_type = 'artist' and artist_id is not null and venue_id is null)
    or (subject_type = 'venue' and venue_id is not null and artist_id is null)
  )
);

comment on table public.claims is
  'Richieste di reclamo di una scheda. Si scrive solo tramite le funzioni: qui non si modificano gli stati a mano.';

comment on column public.claims.decided_by is
  'Chi ha deciso la richiesta. Vuoto su un reclamo artista approvato = accettato subito, senza moderatore: il reclamo artista è immediato per disegno.';

-- Una sola richiesta aperta per persona e soggetto.
create unique index claims_una_per_persona_idx
  on public.claims (profile_id, coalesce(artist_id, venue_id))
  where status = 'pending';

-- La coda dell'admin legge per stato, le schede per soggetto.
create index claims_coda_idx on public.claims (status, created_at);
create index claims_soggetto_idx on public.claims (artist_id, venue_id);

alter table public.claims enable row level security;

-- Si legge la propria richiesta (per sapere che è in esame) o tutte se admin.
-- Nessuna policy di scrittura: le funzioni qui sotto sono l'unica porta.
create policy claims_select_own_or_admin on public.claims
  for select to public
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Reclamo immediato di una scheda artista
--
-- L'artista vero non aspetta un moderatore per esistere sulla piattaforma: il
-- collegamento è immediato e obbliga solo a un link di prova. Un admin lo
-- verifica (o lo revoca) dalla coda.
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

  if not exists (
    select 1 from public.profiles p where p.id = v_uid and p.role = 'artist'
  ) then
    raise exception 'Solo un profilo artista può reclamare una scheda artista' using errcode = '42501';
  end if;

  -- Un profilo amministra una scheda sola: non è una regola di questo blocco,
  -- è il vincolo `artists_profile_id_key` che esiste dalla Fase 1. Meglio dirlo
  -- con una frase che lasciare che sia il vincolo a parlare da solo.
  if exists (select 1 from public.artists a where a.profile_id = v_uid) then
    raise exception 'Gestisci già una scheda artista: un profilo ne amministra una sola' using errcode = 'P0001';
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
--
-- La scheda del locale ospita gli eventi: lì un errore costa di più.
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
    select 1 from public.profiles p where p.id = v_uid and p.role = 'venue'
  ) then
    raise exception 'Solo un profilo locale può reclamare la scheda di un locale' using errcode = '42501';
  end if;

  -- Come per l'artista: `venues_profile_id_key` permette una scheda sola.
  if exists (select 1 from public.venues v where v.profile_id = v_uid) then
    raise exception 'Gestisci già la scheda di un locale: un profilo ne amministra una sola' using errcode = 'P0001';
  end if;

  insert into public.claims (subject_type, venue_id, profile_id, status, proof_url)
  values ('venue', p_venue_id, v_uid, 'pending', btrim(p_proof_url))
  returning id into v_id;

  return v_id;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Decisione dell'admin su una richiesta
--
-- Primo che ottiene l'approvazione vince: chi arriva dopo trova la scheda
-- occupata, non la sovrascrive. Approvare equivale a verificare, perché
-- l'admin ha appena controllato la prova.
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
    if exists (
      select 1 from public.artists a
      where a.profile_id = v_claim.profile_id and a.id <> v_claim.artist_id
    ) then
      raise exception 'Chi ha chiesto la scheda amministra già una scheda artista' using errcode = 'P0001';
    end if;
    update public.artists set profile_id = v_claim.profile_id where id = v_claim.artist_id;
  else
    select profile_id into v_titolare from public.venues where id = v_claim.venue_id for update;
    if v_titolare is not null and v_titolare <> v_claim.profile_id then
      raise exception 'La scheda è già stata reclamata da altri' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.venues v
      where v.profile_id = v_claim.profile_id and v.id <> v_claim.venue_id
    ) then
      raise exception 'Chi ha chiesto la scheda amministra già la scheda di un locale' using errcode = 'P0001';
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

  -- Le altre richieste aperte sullo stesso soggetto non hanno più senso.
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

-- ---------------------------------------------------------------------------
-- Revoca: la scheda torna a OpenStage
--
-- Non tocca la verifica del profilo: la persona resta sé stessa, perde la
-- scheda. La verifica si toglie a parte, con `set_profile_verified`.
-- ---------------------------------------------------------------------------
create or replace function public.revoke_claim(
  p_claim_id uuid,
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
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può revocare un reclamo' using errcode = '42501';
  end if;

  select * into v_claim from public.claims where id = p_claim_id for update;
  if not found then
    raise exception 'Richiesta inesistente' using errcode = 'P0002';
  end if;
  if v_claim.status <> 'approved' then
    raise exception 'Si revoca solo un reclamo approvato' using errcode = 'P0001';
  end if;

  if v_claim.subject_type = 'artist' then
    update public.artists
       set profile_id = null
     where id = v_claim.artist_id and profile_id = v_claim.profile_id;
  else
    update public.venues
       set profile_id = null
     where id = v_claim.venue_id and profile_id = v_claim.profile_id;
  end if;

  update public.claims
     set status = 'revoked',
         decided_at = now(),
         decided_by = v_admin,
         note = coalesce(p_nota, note)
   where id = p_claim_id;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- La verifica: il permesso di pubblicare
-- ---------------------------------------------------------------------------
create or replace function public.set_profile_verified(
  p_profile_id uuid,
  p_verificato boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può verificare un profilo' using errcode = '42501';
  end if;

  update public.profiles
     set verified_at = case
       when p_verificato then coalesce(verified_at, now())
       else null
     end
   where id = p_profile_id;

  if not found then
    raise exception 'Profilo inesistente' using errcode = 'P0002';
  end if;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Chi non è verificato non pubblica
--
-- Si controlla solo il *passaggio* a pubblicato: una modifica a un evento già
-- pubblicato non lo riporta in bozza (a un refuso non si risponde sparando
-- l'evento dal sito). Le operazioni senza utente (migrazioni, servizio) e
-- quelle dell'admin non sono toccate.
-- ---------------------------------------------------------------------------
create or replace function public.events_require_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published')
     and not exists (
       select 1 from public.profiles p
       where p.id = new.created_by and p.verified_at is not null
     )
  then
    new.status := 'draft';
  end if;

  return new;
end;
$fn$;

drop trigger if exists events_require_review on public.events;

create trigger events_require_review
  before insert or update on public.events
  for each row execute function public.events_require_review();

-- ---------------------------------------------------------------------------
-- Elenco dei profili verificati: serve al badge pubblico "Verificato".
--
-- `profiles` è leggibile solo da sé stessi o dall'admin (giusto: contiene
-- l'email), ma la verifica è un fatto pubblico: questa funzione espone solo gli
-- identificativi, che da soli non dicono nulla.
-- ---------------------------------------------------------------------------
create or replace function public.verified_profile_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select id from public.profiles where verified_at is not null;
$fn$;

-- ---------------------------------------------------------------------------
-- Permessi: solo gli utenti autenticati possono chiamare le funzioni di
-- reclamo. Un anonimo non ha identità da collegare, e comunque i controlli
-- interni (`auth.uid()`, `is_admin()`) lo fermerebbero: qui si toglie proprio
-- la possibilità di provarci.
-- ---------------------------------------------------------------------------
revoke all on function public.claim_artist(uuid, text) from public, anon;
revoke all on function public.request_venue_claim(uuid, text) from public, anon;
revoke all on function public.decide_claim(uuid, boolean, text) from public, anon;
revoke all on function public.revoke_claim(uuid, text) from public, anon;
revoke all on function public.set_profile_verified(uuid, boolean) from public, anon;

grant execute on function public.claim_artist(uuid, text) to authenticated;
grant execute on function public.request_venue_claim(uuid, text) to authenticated;
grant execute on function public.decide_claim(uuid, boolean, text) to authenticated;
grant execute on function public.revoke_claim(uuid, text) to authenticated;
grant execute on function public.set_profile_verified(uuid, boolean) to authenticated;

grant execute on function public.verified_profile_ids() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pulizia segnalata dal linter (già presente prima di questo blocco):
-- `search_path` fisso su slugify e set_unique_slug.
-- ---------------------------------------------------------------------------
alter function public.slugify(text) set search_path = public, pg_temp;
alter function public.set_unique_slug() set search_path = public, pg_temp;
