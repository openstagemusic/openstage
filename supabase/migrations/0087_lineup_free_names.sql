-- ============================================================================
-- OpenStage - Lineup con nomi liberi
--
-- Non tutti gli artisti hanno una scheda su OpenStage: una band che suona una
-- sera può non esistere nella directory. La tabella prevedeva già
-- `artist_name`; qui si permette di scriverlo dal modulo.
--
-- La funzione viene ricreata con un parametro in più, quindi la vecchia firma
-- va eliminata: con i valori di default le due versioni sarebbero ambigue.
--
-- Idempotente.
-- ============================================================================

drop function if exists public.set_event_lineup(uuid, uuid, uuid[]);

create or replace function public.set_event_lineup(
  p_event uuid,
  p_main uuid,
  p_artists uuid[] default '{}',
  p_names text[] default '{}'
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

  -- Nomi scritti a mano: niente doppioni (per nome, senza maiuscole), niente
  -- righe vuote, e nessun nome che ripete l'artista principale collegato.
  insert into public.event_artists (event_id, artist_name, position)
  select p_event, n.name, 200 + row_number() over (order by n.name)
    from (
      select distinct on (lower(trim(x))) trim(x) as name
        from unnest(coalesce(p_names, '{}'::text[])) as x
       where length(trim(x)) > 0
       order by lower(trim(x)), trim(x)
    ) n
   where p_main is null
      or not exists (
        select 1 from public.artists a
         where a.id = p_main and lower(a.name) = lower(n.name)
      );
end;
$fn$;

revoke all on function public.set_event_lineup(uuid, uuid, uuid[], text[]) from public;
grant execute on function public.set_event_lineup(uuid, uuid, uuid[], text[]) to authenticated;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0087', 'lineup_free_names')
on conflict (version) do nothing;
