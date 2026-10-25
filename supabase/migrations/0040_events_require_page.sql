-- ============================================================================
-- OpenStage — Fase 9 (prima della scheda non si creano eventi)
-- Un profilo artista o locale senza la propria scheda non può inserire eventi.
-- Succede dopo un unclaim: la scheda torna a OpenStage ma il ruolo resta.
--
-- La regola vive nel database, non solo nell'interfaccia: vale anche per una
-- chiamata diretta all'API. L'admin resta fuori dal controllo.
--
-- Idempotente.
-- ============================================================================

create or replace function public.events_require_page()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_role public.user_role;
begin
  if auth.uid() is null or public.is_admin() or new.created_by is null then
    return new;
  end if;

  select role into v_role from public.profiles where id = new.created_by;

  if v_role = 'artist' and not exists (
    select 1 from public.artists where profile_id = new.created_by
  ) then
    raise exception 'Crea prima la tua scheda artista' using errcode = 'OS422';
  end if;

  if v_role = 'venue' and not exists (
    select 1 from public.venues where profile_id = new.created_by
  ) then
    raise exception 'Crea prima la tua scheda locale' using errcode = 'OS422';
  end if;

  return new;
end;
$fn$;

revoke all on function public.events_require_page() from public, anon, authenticated;

drop trigger if exists events_require_page on public.events;
create trigger events_require_page
  before insert on public.events
  for each row execute function public.events_require_page();
