-- ============================================================================
-- OpenStage - Fase 14B (irrigidimento dei permessi)
--
-- Supabase segnala ogni funzione `security definer` eseguibile da `anon` e
-- `authenticated`. Per quasi tutte è voluto: la funzione controlla da sé chi
-- sta chiamando (`is_admin()`, `auth.uid()`). Tre gruppi però non hanno nessun
-- motivo di essere raggiungibili dal client:
--
-- - `claim_email_batch`: prende in carico le email da spedire. Chiamata da
--   anon, chiunque potrebbe svuotare la coda o consumare la quota giornaliera.
-- - `enqueue_weekly_digests`: accoda i riepiloghi settimanali di tutti gli
--   utenti. Va lanciata dal cron, non da un browser.
-- - le `telegram_on_*`: sono funzioni **trigger**, le chiama il database.
--
-- Restano a `service_role` (il worker email usa la chiave di servizio) e al
-- proprietario (il cron gira come `postgres`).
--
-- In più: `city_key` è usata in una colonna generata e non deve dipendere dal
-- `search_path` di chi la chiama.
--
-- Idempotente.
-- ============================================================================

revoke all on function public.claim_email_batch(integer, text[]) from public, anon, authenticated;
grant execute on function public.claim_email_batch(integer, text[]) to service_role;

revoke all on function public.enqueue_weekly_digests() from public, anon, authenticated;
grant execute on function public.enqueue_weekly_digests() to service_role;

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'telegram_on_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.signature);
    execute format('grant execute on function %s to service_role', fn.signature);
  end loop;
end
$$;

alter function public.city_key(text) set search_path = pg_catalog, public, pg_temp;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0076', 'function_grants')
on conflict (version) do nothing;
