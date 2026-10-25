-- ============================================================================
-- OpenStage — Fase 8.6b (bot attività separato)
-- Un secondo bot Telegram avvisa quando si registra un utente o viene inserito
-- un evento. I messaggi contengono solo ruolo/stato e totale, nessun dato
-- personale.
--
-- Come per il bot admin, il trigger chiama la rotta Vercel che possiede il
-- token del secondo bot. I segreti stanno in Supabase Vault.
--
-- Idempotente.
-- ============================================================================

create or replace function public.notify_activity_telegram(
  p_text text,
  p_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = public, vault, net, pg_temp
as $fn$
declare
  v_token text;
  v_chat text;
  v_inserted boolean := false;
begin
  if p_text is null or btrim(p_text) = '' then
    return;
  end if;

  select decrypted_secret into v_token
    from vault.decrypted_secrets where name = 'telegram_activity_bot_token' limit 1;
  select decrypted_secret into v_chat
    from vault.decrypted_secrets where name = 'telegram_activity_chat_id' limit 1;

  if v_token is null or v_chat is null then
    return;
  end if;

  if p_dedupe_key is not null then
    insert into public.telegram_alert_log (dedupe_key, message)
    values (p_dedupe_key, p_text)
    on conflict (dedupe_key) do nothing;

    get diagnostics v_inserted = row_count;
    if not v_inserted then
      return;
    end if;
  end if;

  perform net.http_post(
    url := 'https://getopenstage.it/api/admin/telegram/activity',
    body := jsonb_build_object('text', p_text),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-telegram-secret', v_token
    ),
    timeout_milliseconds := 10000
  );
end;
$fn$;

revoke all on function public.notify_activity_telegram(text, text) from public, anon, authenticated;

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

  v_role := case new.role
    when 'artist' then 'artista'
    when 'venue' then 'locale'
    when 'admin' then 'admin'
    else 'fan'
  end;

  perform public.notify_activity_telegram(
    '🆕 Nuova registrazione · ruolo: ' || v_role || ' · utenti totali: ' || v_total::text || chr(10) ||
    'https://getopenstage.it/it/admin',
    'profile:' || new.id::text
  );

  return null;
end;
$fn$;

revoke all on function public.telegram_on_new_profile() from public;
drop trigger if exists telegram_on_new_profile on public.profiles;
create trigger telegram_on_new_profile
  after insert on public.profiles
  for each row execute function public.telegram_on_new_profile();

create or replace function public.telegram_on_new_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_total integer;
  v_status text;
begin
  select count(*) into v_total from public.events;

  v_status := case new.status
    when 'draft' then 'bozza'
    when 'cancelled' then 'annullato'
    else 'pubblicato'
  end;

  perform public.notify_activity_telegram(
    '🎵 Nuovo evento · stato: ' || v_status || ' · eventi totali: ' || v_total::text || chr(10) ||
    'https://getopenstage.it/it/admin/eventi',
    'event:' || new.id::text
  );

  return null;
end;
$fn$;

revoke all on function public.telegram_on_new_event() from public;
drop trigger if exists telegram_on_new_event on public.events;
create trigger telegram_on_new_event
  after insert on public.events
  for each row execute function public.telegram_on_new_event();
