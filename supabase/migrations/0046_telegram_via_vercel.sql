-- ============================================================================
-- OpenStage — Fase 8.6.1 (Telegram attraverso Vercel)
-- Supabase non riesce a raggiungere api.telegram.org in modo affidabile:
-- il trigger chiama la rotta `/api/admin/telegram/alert` su Vercel, che invia
-- il messaggio con il token già presente nelle env del progetto.
--
-- Il token resta in Vault solo per firmare la chiamata (`x-telegram-secret`).
-- Idempotente.
-- ============================================================================

create or replace function public.notify_admin_telegram(
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
    from vault.decrypted_secrets where name = 'telegram_bot_token' limit 1;
  select decrypted_secret into v_chat
    from vault.decrypted_secrets where name = 'telegram_admin_chat_id' limit 1;

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
    url := 'https://getopenstage.it/api/admin/telegram/alert',
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

revoke all on function public.notify_admin_telegram(text, text) from public, anon, authenticated;

drop function if exists public.admin_send_telegram_test();
