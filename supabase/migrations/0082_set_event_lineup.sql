-- ============================================================================
-- OpenStage - Scrivere la lineup in una transazione sola
--
-- Cancellare e reinserire dal client lascerebbe la lineup vuota se la seconda
-- chiamata fallisce. Qui è una funzione sola: o passa tutta, o non cambia
-- niente.
--
-- Controlla i permessi **dentro**: chi non gestisce la serata non può
-- riscriverne la lineup, nemmeno chiamando l'RPC da fuori dal sito.
--
-- Idempotente.
-- ============================================================================

create or replace function public.set_event_lineup(
  p_event uuid,
  p_main uuid,
  p_artists uuid[] default '{}'
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
begin
  if not exists (
    select 1
      from public.events e
     where e.id = p_event
       and (
         e.created_by = (select auth.uid())
         or (select public.is_admin())
         or exists (
           select 1 from public.venues v
           where v.id = e.venue_id and v.profile_id = (select auth.uid())
         )
       )
  ) then
    raise exception 'Non puoi modificare la lineup di questa serata'
      using errcode = '42501';
  end if;

  if p_main is not null and not exists (select 1 from public.artists where id = p_main) then
    raise exception 'Artista principale inesistente' using errcode = 'P0002';
  end if;

  delete from public.event_artists where event_id = p_event;

  if p_main is not null then
    insert into public.event_artists (event_id, artist_id, position)
    values (p_event, p_main, 0);
  end if;

  insert into public.event_artists (event_id, artist_id, position)
  select p_event, a.id, 100 + row_number() over (order by a.id)
    from public.artists a
   where a.id = any(coalesce(p_artists, '{}'::uuid[]))
     and a.id is distinct from p_main
  on conflict do nothing;
end;
$fn$;

revoke all on function public.set_event_lineup(uuid, uuid, uuid[]) from public;
grant execute on function public.set_event_lineup(uuid, uuid, uuid[]) to authenticated;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0082', 'set_event_lineup')
on conflict (version) do nothing;
