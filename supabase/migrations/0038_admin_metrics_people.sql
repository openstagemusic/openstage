-- ============================================================================
-- OpenStage — Fase 8.2/8.3 (metriche reali e azioni persone/contenuti)
-- 1. `admin_metrics()`: un solo giro sul database per i numeri della control room.
-- 2. `admin_set_user_suspended()`: sospensione/ripristino con audit.
-- 3. `admin_resolve_report()`: chiusura/archiviazione segnalazioni con audit.
--
-- Tutte le funzioni sono `security definer` e ricontrollano `is_admin()`:
-- l'interfaccia non è mai l'unica difesa. Idempotente.
-- ============================================================================

create or replace function public.admin_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_now timestamptz := now();
  v_month timestamptz := date_trunc('month', now());
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può leggere le metriche' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'generatedAt', v_now,
    'usersTotal', (select count(*) from public.profiles),
    'usersFan', (select count(*) from public.profiles where role = 'fan'),
    'usersArtist', (select count(*) from public.profiles where role = 'artist'),
    'usersVenue', (select count(*) from public.profiles where role = 'venue'),
    'usersAdmin', (select count(*) from public.profiles where role = 'admin'),
    'usersSuspended', (select count(*) from public.profiles where suspended_at is not null),
    'usersNewMonth', (select count(*) from public.profiles where created_at >= v_month),

    'artistsTotal', (select count(*) from public.artists),
    'artistsClaimed', (select count(*) from public.artists where profile_id is not null),
    'artistsWithoutEvents', (
      select count(*) from public.artists a
      where not exists (select 1 from public.events e where e.artist_id = a.id and e.status <> 'draft')
    ),
    'venuesTotal', (select count(*) from public.venues),
    'venuesClaimed', (select count(*) from public.venues where profile_id is not null),
    'venuesWithoutEvents', (
      select count(*) from public.venues v
      where not exists (select 1 from public.events e where e.venue_id = v.id and e.status <> 'draft')
    ),

    'eventsPublished', (select count(*) from public.events where status = 'published'),
    'eventsDraft', (select count(*) from public.events where status = 'draft'),
    'eventsCancelled', (select count(*) from public.events where status = 'cancelled'),
    'eventsUpcoming', (
      select count(*) from public.events
      where status = 'published' and starts_at >= v_now
    ),
    'eventsNewMonth', (select count(*) from public.events where created_at >= v_month),

    'savedTotal', (select count(*) from public.saved_events),
    'messagesNew', (select count(*) from public.contact_messages where status = 'new'),
    'messagesOpen', (select count(*) from public.contact_messages where status <> 'closed'),
    'reportsOpen', (select count(*) from public.reports where status = 'open'),
    'claimsPending', (select count(*) from public.claims where status = 'pending'),
    'claimsToVerify', (
      select count(*) from public.claims c
      join public.profiles p on p.id = c.profile_id
      where c.status = 'approved' and p.verified_at is null
    ),
    'emailQueued', (select count(*) from public.email_queue where status = 'queued'),
    'emailFailed', (select count(*) from public.email_queue where status = 'failed')
  );
end;
$fn$;

revoke all on function public.admin_metrics() from public;
grant execute on function public.admin_metrics() to authenticated;

create or replace function public.admin_set_user_suspended(
  p_profile_id uuid,
  p_suspended boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_target public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può sospendere un account' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'Profilo inesistente' using errcode = 'P0002';
  end if;

  if v_target.role = 'admin' then
    raise exception 'Un amministratore non può essere sospeso' using errcode = 'P0001';
  end if;

  if v_target.id = v_admin then
    raise exception 'Non puoi sospendere il tuo account' using errcode = 'P0001';
  end if;

  update public.profiles
     set suspended_at = case when p_suspended then now() else null end
   where id = p_profile_id;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    case when p_suspended then 'user.suspend' else 'user.restore' end,
    'profile',
    p_profile_id,
    jsonb_build_object(
      'email', v_target.email,
      'role', v_target.role,
      'note', nullif(trim(coalesce(p_note, '')), '')
    )
  );
end;
$fn$;

revoke all on function public.admin_set_user_suspended(uuid, boolean, text) from public;
grant execute on function public.admin_set_user_suspended(uuid, boolean, text) to authenticated;

create or replace function public.admin_resolve_report(
  p_report_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_report public.reports;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può gestire una segnalazione' using errcode = '42501';
  end if;

  if p_status not in ('open', 'resolved', 'dismissed') then
    raise exception 'Stato segnalazione non valido' using errcode = 'P0001';
  end if;

  select * into v_report from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Segnalazione inesistente' using errcode = 'P0002';
  end if;

  update public.reports
     set status = p_status,
         resolved_at = case when p_status = 'open' then null else now() end,
         resolved_by = case when p_status = 'open' then null else v_admin end
   where id = p_report_id;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    'report.' || p_status,
    'event',
    v_report.event_id,
    jsonb_build_object(
      'reportId', p_report_id,
      'reason', v_report.reason,
      'note', nullif(trim(coalesce(p_note, '')), '')
    )
  );
end;
$fn$;

revoke all on function public.admin_resolve_report(uuid, text, text) from public;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;
