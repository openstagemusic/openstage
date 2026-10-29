-- ============================================================================
-- OpenStage - Fase 11A (limite richieste Pro)
-- Una richiesta ogni 30 giorni per profilo, anche se qualcuno chiama PostgREST
-- direttamente invece di passare dalla server action.
--
-- Idempotente.
-- ============================================================================

create or replace function public.guard_pro_request_monthly()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if exists (
    select 1
    from public.pro_feature_requests r
    where r.profile_id = new.profile_id
      and r.created_at > now() - interval '30 days'
  ) then
    raise exception 'Hai già inviato una richiesta negli ultimi 30 giorni'
      using errcode = 'P0001';
  end if;

  return new;
end;
$fn$;

drop trigger if exists pro_feature_requests_monthly on public.pro_feature_requests;
create trigger pro_feature_requests_monthly
  before insert on public.pro_feature_requests
  for each row execute function public.guard_pro_request_monthly();

insert into supabase_migrations.schema_migrations (version, name) values
  ('0060', 'pro_request_monthly')
on conflict (version) do nothing;
