-- ============================================================================
-- OpenStage — Fase 8.4.1 (l'invito accettato entra nei claim attivi)
-- Accettare un invito collegava la scheda ma non creava la riga in `claims`:
-- la scheda non compariva in "Claim attivi" e non era revocabile dalla coda.
-- Ora l'accettazione scrive anche il claim approvato, con la pagina come prova
-- e l'admin che ha invitato come decisore.
--
-- Backfill: gli inviti già accettati prima di questa correzione ricevono il
-- loro claim, senza duplicare quelli esistenti.
--
-- Idempotente.
-- ============================================================================

create or replace function public.accept_claim_invite(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp
as $fn$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_invite public.claim_invites;
  v_profile public.profiles;
  v_name text;
  v_slug text;
  v_proof text;
begin
  if v_uid is null then raise exception 'Devi accedere per accettare l''invito' using errcode = '42501'; end if;
  if p_token is null or length(trim(p_token)) < 16 then raise exception 'Invito non valido' using errcode = 'P0002'; end if;

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select * into v_invite from public.claim_invites
   where token_hash = v_hash for update;

  if not found then raise exception 'Invito non valido' using errcode = 'P0002'; end if;
  if v_invite.status <> 'pending' then raise exception 'Questo invito non è più valido' using errcode = 'P0001'; end if;
  if v_invite.expires_at <= now() then
    update public.claim_invites set status = 'expired' where id = v_invite.id;
    raise exception 'Questo invito è scaduto' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then raise exception 'Profilo inesistente' using errcode = 'P0002'; end if;
  if lower(coalesce(v_profile.email, '')) <> v_invite.email then
    raise exception 'Questo invito è per un''altra email' using errcode = '42501';
  end if;
  if v_profile.role::text not in ('fan', v_invite.subject_type) then
    raise exception 'Il tuo account ha già un altro ruolo' using errcode = 'P0001';
  end if;

  if v_invite.subject_type = 'artist' then
    select name, slug into v_name, v_slug from public.artists where id = v_invite.artist_id;
    if not found then raise exception 'Scheda artista inesistente' using errcode = 'P0002'; end if;
    if exists (select 1 from public.artists where id = v_invite.artist_id and profile_id is not null) then
      raise exception 'Questa scheda è già reclamata' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.artists where profile_id = v_uid) then
      raise exception 'Hai già una scheda artista' using errcode = 'P0001';
    end if;
    update public.artists set profile_id = v_uid where id = v_invite.artist_id;
    v_proof := 'https://getopenstage.it/artisti/' || v_slug;
  else
    select name, slug into v_name, v_slug from public.venues where id = v_invite.venue_id;
    if not found then raise exception 'Scheda locale inesistente' using errcode = 'P0002'; end if;
    if exists (select 1 from public.venues where id = v_invite.venue_id and profile_id is not null) then
      raise exception 'Questa scheda è già reclamata' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.venues where profile_id = v_uid) then
      raise exception 'Hai già una scheda locale' using errcode = 'P0001';
    end if;
    update public.venues set profile_id = v_uid where id = v_invite.venue_id;
    v_proof := 'https://getopenstage.it/locali/' || v_slug;
  end if;

  perform set_config('os.claim_accept', 'on', true);

  update public.profiles
     set role = case when role = 'fan' then v_invite.subject_type::public.user_role else role end,
         verified_at = coalesce(verified_at, now())
   where id = v_uid;

  perform set_config('os.claim_accept', '', true);

  update public.claim_invites
     set status = 'accepted', accepted_by = v_uid, accepted_at = now()
   where id = v_invite.id;

  insert into public.claims (
    subject_type, artist_id, venue_id, profile_id, status, proof_url, note,
    created_at, decided_at, decided_by
  )
  values (
    v_invite.subject_type,
    v_invite.artist_id,
    v_invite.venue_id,
    v_uid,
    'approved',
    v_proof,
    'Claim accettato tramite invito',
    now(),
    now(),
    v_invite.created_by
  );

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_uid,
    'claim.invite_accept',
    v_invite.subject_type,
    coalesce(v_invite.artist_id, v_invite.venue_id),
    jsonb_build_object('inviteId', v_invite.id, 'email', v_invite.email)
  );

  return jsonb_build_object(
    'subjectType', v_invite.subject_type,
    'name', v_name,
    'slug', v_slug
  );
end;
$fn$;

revoke all on function public.accept_claim_invite(text) from public;
grant execute on function public.accept_claim_invite(text) to authenticated;

-- Gli inviti accettati prima di questa correzione: crea il claim mancante.
insert into public.claims (
  subject_type, artist_id, venue_id, profile_id, status, proof_url, note,
  created_at, decided_at, decided_by
)
select
  ci.subject_type,
  ci.artist_id,
  ci.venue_id,
  ci.accepted_by,
  'approved',
  case
    when ci.subject_type = 'artist' then 'https://getopenstage.it/artisti/' || a.slug
    else 'https://getopenstage.it/locali/' || v.slug
  end,
  'Claim accettato tramite invito',
  coalesce(ci.accepted_at, ci.created_at),
  coalesce(ci.accepted_at, ci.created_at),
  ci.created_by
from public.claim_invites ci
left join public.artists a on a.id = ci.artist_id
left join public.venues v on v.id = ci.venue_id
where ci.status = 'accepted'
  and ci.accepted_by is not null
  and not exists (
    select 1 from public.claims c
    where c.profile_id = ci.accepted_by
      and c.status = 'approved'
      and coalesce(c.artist_id, c.venue_id) = coalesce(ci.artist_id, ci.venue_id)
  );
