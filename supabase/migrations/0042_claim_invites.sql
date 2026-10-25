-- ============================================================================
-- OpenStage — Fase 8.4 (claim a invito)
-- L'admin invita una persona a reclamare una scheda artista/locale. Il token
-- arriva per email se l'account non esiste, altrimenti come notifica in-app.
-- Il database conserva solo l'hash: il token in chiaro vive solo nel link.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.claim_invites (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('artist', 'venue')),
  artist_id uuid references public.artists (id) on delete cascade,
  venue_id uuid references public.venues (id) on delete cascade,
  email text not null,
  channel text not null default 'email' check (channel in ('email', 'notification')),
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_by uuid references public.profiles (id) on delete set null,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  check (
    (subject_type = 'artist' and artist_id is not null and venue_id is null)
    or
    (subject_type = 'venue' and venue_id is not null and artist_id is null)
  )
);

create index if not exists claim_invites_token_idx
  on public.claim_invites (token_hash);
create index if not exists claim_invites_created_idx
  on public.claim_invites (created_at desc);
create unique index if not exists claim_invites_pending_unique
  on public.claim_invites (coalesce(artist_id, venue_id), email)
  where status = 'pending';

alter table public.claim_invites enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'claim_invites'
      and policyname = 'claim_invites_select_admin'
  ) then
    create policy claim_invites_select_admin on public.claim_invites
      for select using ((select public.is_admin()));
  end if;
end $$;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $
begin
  if auth.uid() is not null and not public.is_admin()
     and coalesce(current_setting('os.claim_accept', true), '') <> 'on' then
    if new.role is distinct from old.role
       and (old.role <> 'fan' or new.role not in ('artist', 'venue')) then
      new.role := old.role;
    end if;

    new.verified_at := old.verified_at;
    new.suspended_at := old.suspended_at;
    new.events_daily_limit := old.events_daily_limit;
    new.email := old.email;
    new.mfa_bypass_until := old.mfa_bypass_until;
  end if;

  new.updated_at := now();
  return new;
end;
$;

create or replace function public.claim_invite_info(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_hash text;
  v_invite public.claim_invites;
  v_name text;
  v_slug text;
  v_status text;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('valid', false, 'status', 'invalid');
  end if;

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select * into v_invite from public.claim_invites where token_hash = v_hash;
  if not found then
    return jsonb_build_object('valid', false, 'status', 'invalid');
  end if;

  v_status := v_invite.status;
  if v_status = 'pending' and v_invite.expires_at <= now() then
    v_status := 'expired';
  end if;

  if v_invite.subject_type = 'artist' then
    select name, slug into v_name, v_slug from public.artists where id = v_invite.artist_id;
  else
    select name, slug into v_name, v_slug from public.venues where id = v_invite.venue_id;
  end if;

  return jsonb_build_object(
    'valid', v_status = 'pending',
    'status', v_status,
    'subjectType', v_invite.subject_type,
    'name', v_name,
    'slug', v_slug,
    'email', v_invite.email,
    'expiresAt', v_invite.expires_at
  );
end;
$fn$;

revoke all on function public.claim_invite_info(text) from public;
grant execute on function public.claim_invite_info(text) to anon, authenticated;

create or replace function public.admin_create_claim_invite(
  p_subject_type text,
  p_subject_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text;
  v_slug text;
  v_owner uuid;
  v_token text;
  v_hash text;
  v_invite_id uuid;
  v_expires timestamptz := now() + interval '7 days';
  v_account uuid;
  v_link text;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può invitare' using errcode = '42501';
  end if;

  if p_subject_type not in ('artist', 'venue') then
    raise exception 'Tipo di scheda non valido' using errcode = 'P0001';
  end if;

  if v_email = '' or position('@' in v_email) < 2 then
    raise exception 'Email non valida' using errcode = 'P0001';
  end if;

  if p_subject_type = 'artist' then
    select name, slug, profile_id into v_name, v_slug, v_owner
      from public.artists where id = p_subject_id;
    if not found then
      raise exception 'Scheda artista inesistente' using errcode = 'P0002';
    end if;
    if v_owner is not null then
      raise exception 'Questa scheda è già reclamata' using errcode = 'P0001';
    end if;
  else
    select name, slug, profile_id into v_name, v_slug, v_owner
      from public.venues where id = p_subject_id;
    if not found then
      raise exception 'Scheda locale inesistente' using errcode = 'P0002';
    end if;
    if v_owner is not null then
      raise exception 'Questa scheda è già reclamata' using errcode = 'P0001';
    end if;
  end if;

  if exists (
    select 1 from public.claim_invites
    where status = 'pending'
      and coalesce(artist_id, venue_id) = p_subject_id
  ) then
    raise exception 'Esiste già un invito in attesa per questa scheda' using errcode = 'P0001';
  end if;

  select id into v_account from public.profiles where lower(email) = v_email limit 1;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.claim_invites (
    subject_type, artist_id, venue_id, email, channel, token_hash, expires_at, created_by
  )
  values (
    p_subject_type,
    case when p_subject_type = 'artist' then p_subject_id end,
    case when p_subject_type = 'venue' then p_subject_id end,
    v_email,
    case when v_account is not null then 'notification' else 'email' end,
    v_hash,
    v_expires,
    v_admin
  )
  returning id into v_invite_id;

  v_link := 'https://getopenstage.it/claim/' || v_token;

  if v_account is not null then
    insert into public.notifications (user_id, type, title, body, href, priority, metadata)
    values (
      v_account,
      'claim',
      'Invito a reclamare una scheda',
      'Sei stato invitato a reclamare la scheda di ' || v_name || ' su OpenStage.',
      '/claim/' || v_token,
      'normal',
      jsonb_build_object('inviteId', v_invite_id, 'subjectType', p_subject_type)
    );
  else
    insert into public.email_queue (
      to_email, from_email, subject, text_body, category, idempotency_key, metadata
    )
    values (
      v_email,
      'OpenStage <noreply@getopenstage.it>',
      'Reclama la scheda di ' || v_name || ' su OpenStage',
      'Ciao,' || chr(10) || chr(10) ||
      'OpenStage ha creato la scheda di ' || v_name || ' e vuole darti la possibilità di amministrarla.' || chr(10) || chr(10) ||
      'Apri questo link per reclamarla (scade tra 7 giorni, vale una sola volta):' || chr(10) ||
      v_link || chr(10) || chr(10) ||
      'Se non sei tu, ignora questa email.' || chr(10) || chr(10) ||
      'OpenStage',
      'transactional',
      'claim-invite:' || v_invite_id::text,
      jsonb_build_object('inviteId', v_invite_id, 'subjectType', p_subject_type)
    )
    on conflict (idempotency_key) do nothing;
  end if;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    'claim.invite',
    p_subject_type,
    p_subject_id,
    jsonb_build_object(
      'inviteId', v_invite_id,
      'email', v_email,
      'accountExists', v_account is not null,
      'expiresAt', v_expires
    )
  );

  return jsonb_build_object(
    'inviteId', v_invite_id,
    'accountExists', v_account is not null,
    'expiresAt', v_expires
  );
end;
$fn$;

revoke all on function public.admin_create_claim_invite(text, uuid, text) from public;
grant execute on function public.admin_create_claim_invite(text, uuid, text) to authenticated;

create or replace function public.accept_claim_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_invite public.claim_invites;
  v_profile public.profiles;
  v_name text;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'Devi accedere per accettare l''invito' using errcode = '42501';
  end if;

  if p_token is null or length(trim(p_token)) < 16 then
    raise exception 'Invito non valido' using errcode = 'P0002';
  end if;

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select * into v_invite from public.claim_invites
   where token_hash = v_hash for update;

  if not found then
    raise exception 'Invito non valido' using errcode = 'P0002';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Questo invito non è più valido' using errcode = 'P0001';
  end if;

  if v_invite.expires_at <= now() then
    update public.claim_invites set status = 'expired' where id = v_invite.id;
    raise exception 'Questo invito è scaduto' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profilo inesistente' using errcode = 'P0002';
  end if;

  if lower(coalesce(v_profile.email, '')) <> v_invite.email then
    raise exception 'Questo invito è per un''altra email' using errcode = '42501';
  end if;

  if v_profile.role::text not in ('fan', v_invite.subject_type) then
    raise exception 'Il tuo account ha già un altro ruolo' using errcode = 'P0001';
  end if;

  if v_invite.subject_type = 'artist' then
    select name, slug into v_name, v_slug from public.artists
     where id = v_invite.artist_id;
    if not found then
      raise exception 'Scheda artista inesistente' using errcode = 'P0002';
    end if;
    if exists (select 1 from public.artists where id = v_invite.artist_id and profile_id is not null) then
      raise exception 'Questa scheda è già reclamata' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.artists where profile_id = v_uid) then
      raise exception 'Hai già una scheda artista' using errcode = 'P0001';
    end if;
    update public.artists set profile_id = v_uid
     where id = v_invite.artist_id;
  else
    select name, slug into v_name, v_slug from public.venues
     where id = v_invite.venue_id;
    if not found then
      raise exception 'Scheda locale inesistente' using errcode = 'P0002';
    end if;
    if exists (select 1 from public.venues where id = v_invite.venue_id and profile_id is not null) then
      raise exception 'Questa scheda è già reclamata' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.venues where profile_id = v_uid) then
      raise exception 'Hai già una scheda locale' using errcode = 'P0001';
    end if;
    update public.venues set profile_id = v_uid
     where id = v_invite.venue_id;
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

create or replace function public.admin_revoke_claim_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_invite public.claim_invites;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può revocare un invito' using errcode = '42501';
  end if;

  select * into v_invite from public.claim_invites
   where id = p_invite_id for update;

  if not found then
    raise exception 'Invito inesistente' using errcode = 'P0002';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Si revoca solo un invito in attesa' using errcode = 'P0001';
  end if;

  update public.claim_invites
     set status = 'revoked', revoked_at = now()
   where id = p_invite_id;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    'claim.invite_revoke',
    v_invite.subject_type,
    coalesce(v_invite.artist_id, v_invite.venue_id),
    jsonb_build_object('inviteId', p_invite_id, 'email', v_invite.email)
  );
end;
$fn$;

revoke all on function public.admin_revoke_claim_invite(uuid) from public;
grant execute on function public.admin_revoke_claim_invite(uuid) to authenticated;
