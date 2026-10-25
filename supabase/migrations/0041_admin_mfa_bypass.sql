-- ============================================================================
-- OpenStage — Fase 8.5 (sospensione temporanea della 2FA)
-- L'admin può sospendere la 2FA per una finestra breve senza cancellare il
-- fattore TOTP: alla scadenza la verifica torna obbligatoria. Nessuna nuova
-- chiave da configurare.
--
-- La colonna è protetta dal trigger esistente: un profilo non può scriverla
-- da solo, passa solo dalle funzioni `admin_*` (che scrivono l'audit).
-- Idempotente.
-- ============================================================================

alter table public.profiles
  add column if not exists mfa_bypass_until timestamptz;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
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
$$;

create or replace function public.admin_set_mfa_bypass(
  p_minutes integer,
  p_reason text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può sospendere la 2FA' using errcode = '42501';
  end if;

  if p_minutes is null or p_minutes < 5 or p_minutes > 240 then
    raise exception 'Durata non valida: da 5 a 240 minuti' using errcode = 'P0001';
  end if;

  v_until := now() + make_interval(mins => p_minutes);

  update public.profiles
     set mfa_bypass_until = v_until
   where id = v_admin;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    'security.mfa_bypass',
    'profile',
    v_admin,
    jsonb_build_object(
      'minutes', p_minutes,
      'until', v_until,
      'reason', nullif(trim(coalesce(p_reason, '')), '')
    )
  );

  return v_until;
end;
$fn$;

revoke all on function public.admin_set_mfa_bypass(integer, text) from public;
grant execute on function public.admin_set_mfa_bypass(integer, text) to authenticated;

create or replace function public.admin_clear_mfa_bypass()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può modificare la 2FA' using errcode = '42501';
  end if;

  update public.profiles
     set mfa_bypass_until = null
   where id = v_admin;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (v_admin, 'security.mfa_bypass_clear', 'profile', v_admin, '{}'::jsonb);
end;
$fn$;

revoke all on function public.admin_clear_mfa_bypass() from public;
grant execute on function public.admin_clear_mfa_bypass() to authenticated;
