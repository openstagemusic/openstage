-- 0027 - Il permesso di unione usa la stessa regola di tutto il resto.
--
-- La `0025` controllava `profiles.role = 'admin'`; nel progetto l'admin vero è
-- deciso da `public.is_admin()` (l'email in `settings`), che è la funzione usata
-- dalle politiche RLS e dalla coda. Due definizioni di "admin" sono una che
-- funziona e una che prima o poi dice no alla persona sbagliata: qui restano una.
--
-- Le funzioni sono identiche alla `0025` (che è già corretta per le installazioni
-- nuove): questo file serve alle banche dati che hanno già applicato la `0025`.

create or replace function public.merge_event(p_source uuid, p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not exists (select 1 where public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_source = p_target then
    raise exception 'same event' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.events e where e.id = p_target and e.merged_into is null
  ) then
    raise exception 'target missing or already merged' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.events e where e.id = p_source) then
    raise exception 'source missing' using errcode = 'P0002';
  end if;

  update public.saved_events s
     set event_id = p_target
   where s.event_id = p_source
     and not exists (
       select 1 from public.saved_events t
        where t.profile_id = s.profile_id and t.event_id = p_target
     );

  delete from public.saved_events where event_id = p_source;

  update public.events
     set merged_into = p_target,
         merged_at = now(),
         merged_status = status,
         status = 'cancelled',
         cancel_reason = null
   where id = p_source;
end;
$fn$;

create or replace function public.unmerge_event(p_event uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not exists (select 1 where public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.events
     set status = coalesce(merged_status, 'draft'),
         merged_into = null,
         merged_at = null,
         merged_status = null
   where id = p_event and merged_into is not null;
end;
$fn$;
