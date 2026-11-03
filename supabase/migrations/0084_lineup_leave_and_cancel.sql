-- ============================================================================
-- OpenStage - Uscire dalla lineup e avvisare tutti quando una serata salta
--
-- Due gesti che devono stare nel database, perché toccano più tabelle insieme:
--
-- 1. `leave_event_lineup`: l'artista in lineup esce («non posso più suonare»).
--    La riga sparisce e il gestore della serata riceve una notifica. Chi ha
--    creato la serata non "esce": la sua serata è sua.
--
-- 2. `notify_event_cancelled`: quando una serata viene annullata, avvisa tutta
--    la lineup, non solo chi l'aveva salvata. Idempotente: annullare due volte
--    non manda due notifiche.
--
-- Idempotente.
-- ============================================================================

create or replace function public.leave_event_lineup(p_event uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_artist uuid;
  v_artist_name text;
  v_created uuid;
  v_venue_profile uuid;
  v_title text;
begin
  select id, name into v_artist, v_artist_name
    from public.artists
   where profile_id = auth.uid()
   limit 1;

  if v_artist is null then
    raise exception 'Non hai una scheda artista' using errcode = '42501';
  end if;

  select e.created_by, e.title, v.profile_id
    into v_created, v_title, v_venue_profile
    from public.events e
    left join public.venues v on v.id = e.venue_id
   where e.id = p_event;

  if not found then
    raise exception 'Serata inesistente' using errcode = 'P0002';
  end if;

  if v_created = auth.uid() then
    raise exception 'La serata è tua: non puoi uscire dalla lineup'
      using errcode = '42501';
  end if;

  delete from public.event_artists
   where event_id = p_event and artist_id = v_artist;

  if not found then
    raise exception 'Non sei in lineup' using errcode = 'P0001';
  end if;

  if v_created is not null and v_created <> auth.uid() then
    insert into public.notifications (user_id, type, title, body, href, priority, metadata)
    values (
      v_created, 'system', 'Un artista ha lasciato la lineup',
      v_artist_name || ' non potrà più suonare a «' || v_title || '».',
      '/dashboard/eventi/' || p_event,
      'high',
      jsonb_build_object('eventId', p_event, 'kind', 'lineup_left')
    );
  end if;

  if v_venue_profile is not null and v_venue_profile <> auth.uid() and v_venue_profile is distinct from v_created then
    insert into public.notifications (user_id, type, title, body, href, priority, metadata)
    values (
      v_venue_profile, 'system', 'Un artista ha lasciato la lineup',
      v_artist_name || ' non potrà più suonare a «' || v_title || '».',
      '/dashboard/eventi/' || p_event,
      'high',
      jsonb_build_object('eventId', p_event, 'kind', 'lineup_left')
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$fn$;

create or replace function public.notify_event_cancelled(p_event uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_title text;
  v_slug text;
  v_city text;
  v_count integer := 0;
begin
  select e.title, e.slug, e.city_key
    into v_title, v_slug, v_city
    from public.events e
   where e.id = p_event;

  if not found then
    return 0;
  end if;

  insert into public.notifications (user_id, type, title, body, href, priority, metadata)
  select a.profile_id,
         'event_cancelled',
         'Serata annullata',
         'La serata «' || v_title || '» è stata annullata.',
         '/eventi/' || v_city || '/' || v_slug,
         'high',
         jsonb_build_object('eventId', p_event)
    from public.event_artists ea
    join public.artists a on a.id = ea.artist_id
   where ea.event_id = p_event
     and a.profile_id is not null
     and a.profile_id <> auth.uid()
     and not exists (
       select 1 from public.notifications n
        where n.user_id = a.profile_id
          and n.type = 'event_cancelled'
          and n.metadata ->> 'eventId' = p_event::text
     );

  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

revoke all on function public.leave_event_lineup(uuid) from public;
revoke all on function public.notify_event_cancelled(uuid) from public;
grant execute on function public.leave_event_lineup(uuid) to authenticated;
grant execute on function public.notify_event_cancelled(uuid) to authenticated;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0084', 'lineup_leave_and_cancel')
on conflict (version) do nothing;
