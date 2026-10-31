-- ============================================================================
-- OpenStage - Fase 13 (avvisi Telegram più onesti)
-- 1. La registrazione non annuncia più "ruolo: fan": a quella altezza il ruolo
--    non è ancora stato scelto (Google non lo porta con sé).
-- 2. Quando il ruolo viene scelto davvero, arriva un secondo avviso.
-- 3. Il claim dice di quale scheda si tratta, non solo "una scheda locale".
--
-- Idempotente.
-- ============================================================================

create or replace function public.telegram_on_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_total integer;
  v_role text;
begin
  select count(*) into v_total from public.profiles;

  -- Se il ruolo è arrivato con la registrazione (email con metadata), si dice.
  -- Con Google il ruolo è ancora 'fan' e non significa niente: si tace.
  v_role := case new.role
    when 'artist' then ' · artista'
    when 'venue' then ' · locale'
    when 'admin' then ' · admin'
    else ''
  end;

  perform public.notify_activity_telegram(
    '🆕 Nuova registrazione' || v_role || ' · utenti totali: ' || v_total::text || chr(10) ||
    'https://getopenstage.it/it/admin',
    'profile:' || new.id::text
  );

  return null;
end;
$fn$;

revoke all on function public.telegram_on_new_profile() from public;

-- Ruolo scelto dopo l'accesso (onboarding): è qui che si scopre se è artista o locale.
create or replace function public.telegram_on_role_selected()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_total integer;
  v_role text;
begin
  if new.role is not distinct from old.role then
    return null;
  end if;

  -- Il passaggio a "fan" non interessa a nessuno.
  if new.role = 'fan' then
    return null;
  end if;

  select count(*) into v_total from public.profiles;

  v_role := case new.role
    when 'artist' then 'artista'
    when 'venue' then 'locale'
    when 'admin' then 'admin'
    else new.role::text
  end;

  perform public.notify_activity_telegram(
    '🎭 Ruolo scelto: ' || v_role || ' · utenti totali: ' || v_total::text || chr(10) ||
    'https://getopenstage.it/it/admin',
    'role:' || new.id::text || ':' || new.role::text
  );

  return null;
end;
$fn$;

revoke all on function public.telegram_on_role_selected() from public;
drop trigger if exists telegram_on_role_selected on public.profiles;
create trigger telegram_on_role_selected
  after update of role on public.profiles
  for each row execute function public.telegram_on_role_selected();

-- Claim: il messaggio dice quale scheda, così non serve aprire l'admin per capirlo.
create or replace function public.telegram_on_claim()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_name text;
begin
  select coalesce(a.name, v.name)
    into v_name
    from public.claims c
    left join public.artists a on a.id = c.artist_id
    left join public.venues v on v.id = c.venue_id
   where c.id = new.id;

  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.notify_admin_telegram(
      '🔔 Nuova richiesta per la scheda: ' || coalesce(v_name, 'senza nome') || chr(10) ||
      'https://getopenstage.it/it/admin/claim',
      'claim:' || new.id::text
    );
  elsif tg_op = 'UPDATE' and new.status = 'approved' and old.status is distinct from 'approved' then
    perform public.notify_admin_telegram(
      '✅ Scheda reclamata: ' || coalesce(v_name, 'senza nome') || ' — da verificare.' || chr(10) ||
      'https://getopenstage.it/it/admin/claim',
      'claim-approved:' || new.id::text
    );
  end if;

  return null;
end;
$fn$;

revoke all on function public.telegram_on_claim() from public;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0071', 'telegram_role_alerts')
on conflict (version) do nothing;
