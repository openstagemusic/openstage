-- ============================================================================
-- OpenStage - Nomi in lineup: si tiene la grafia scritta dall'utente
--
-- La deduplica per nome usava un ordinamento alfabetico e poteva scegliere
-- «the blue notes» al posto di «The Blue Notes». Ora si tiene la **prima**
-- occorrenza nell'ordine in cui è stata scritta.
--
-- Idempotente.
-- ============================================================================

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

  insert into public.event_artists (event_id, artist_name, position)
  select p_event, n.name, 200 + row_number() over (order by n.ord)
    from (
      select distinct on (lower(trim(x.value))) trim(x.value) as name, x.ord
        from unnest(coalesce(p_names, '{}'::text[])) with ordinality as x(value, ord)
       where length(trim(x.value)) > 0
       order by lower(trim(x.value)), x.ord
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
  ('0088', 'lineup_names_keep_case')
on conflict (version) do nothing;
