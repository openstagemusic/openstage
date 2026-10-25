-- ============================================================================
-- OpenStage — Fase 8.1 (audit + revoca claim)
-- 1. Registro azioni admin, leggibile solo dall'admin.
-- 2. `revoke_claim` ora azzera anche la verifica del profilo: la scheda torna
--    a OpenStage e l'utente non può pubblicare su una scheda nuova senza un
--    nuovo controllo.
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  subject_type text,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_audit_log'
      and policyname = 'admin_audit_log_select_admin'
  ) then
    create policy admin_audit_log_select_admin on public.admin_audit_log
      for select using ((select public.is_admin()));
  end if;
end $$;

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

  -- La verifica è legata alla scheda: senza scheda non c'è più il permesso
  -- di pubblicare senza revisione.
  update public.profiles
     set verified_at = null
   where id = v_claim.profile_id;

  update public.claims
     set status = 'revoked',
         decided_at = now(),
         decided_by = v_admin,
         note = coalesce(p_nota, note)
   where id = p_claim_id;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    'claim.revoke',
    v_claim.subject_type,
    coalesce(v_claim.artist_id, v_claim.venue_id),
    jsonb_build_object(
      'claimId', p_claim_id,
      'profileId', v_claim.profile_id,
      'note', nullif(trim(coalesce(p_nota, '')), '')
    )
  );
end;
$fn$;
