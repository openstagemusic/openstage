-- ============================================================================
-- OpenStage - Telegram: avviso quando arriva una richiesta di lineup
--
-- Il bot avvisava già ticket, claim, segnalazioni, bozze ed email fallite. Con
-- il multi-artista mancava l'unica coda nuova: «sono in questa serata».
--
-- Il messaggio dice chi chiede e per quale serata, con il link alla coda.
-- Dedupe sull'id della richiesta: un solo avviso per richiesta.
--
-- Idempotente.
-- ============================================================================

create or replace function public.telegram_on_join_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_artist text;
  v_event text;
begin
  if new.status <> 'pending' then
    return null;
  end if;

  select a.name into v_artist from public.artists a where a.id = new.artist_id;
  select e.title into v_event from public.events e where e.id = new.event_id;

  perform public.notify_admin_telegram(
    '🎸 Richiesta lineup: ' || coalesce(v_artist, 'un artista') ||
    ' per «' || coalesce(v_event, 'una serata') || '».' || chr(10) ||
    'https://getopenstage.it/it/admin/richieste-lineup',
    'lineup:' || new.id::text
  );

  return null;
end;
$fn$;

revoke all on function public.telegram_on_join_request() from public;
drop trigger if exists telegram_on_join_request on public.event_join_requests;
create trigger telegram_on_join_request
  after insert on public.event_join_requests
  for each row execute function public.telegram_on_join_request();

insert into supabase_migrations.schema_migrations (version, name) values
  ('0086', 'telegram_join_request')
on conflict (version) do nothing;
