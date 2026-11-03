-- ============================================================================
-- OpenStage - «Sono in questa serata»: richieste di ingresso in lineup
--
-- L'artista non crea un doppione: chiede di entrare nella serata che esiste
-- già. La richiesta arriva all'admin, che approva o rifiuta. Solo l'approvazione
-- scrive in `event_artists`: nessun ingresso automatico.
--
-- Perché serve l'approvazione: un locale (o chiunque) potrebbe aggiungere un
-- artista famoso per attirare click. La coda è la difesa.
--
-- La decisione è una funzione sola, `decide_event_join_request`: approvazione,
-- riga di lineup e notifica all'artista stanno nella stessa transazione.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.event_join_requests (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  artist_id   uuid not null references public.artists (id) on delete cascade,
  message     text,
  status      text not null default 'pending',
  decided_by  uuid references public.profiles (id) on delete set null,
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint event_join_requests_status check (
    status in ('pending', 'approved', 'rejected')
  )
);

-- Una sola richiesta aperta per coppia serata/artista.
create unique index if not exists event_join_requests_pending_key
  on public.event_join_requests (event_id, artist_id)
  where status = 'pending';

create index if not exists event_join_requests_status_idx
  on public.event_join_requests (status, created_at desc);

alter table public.event_join_requests enable row level security;

drop policy if exists event_join_requests_read on public.event_join_requests;
create policy event_join_requests_read on public.event_join_requests
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.artists a
      where a.id = event_join_requests.artist_id
        and a.profile_id = (select auth.uid())
    )
  );

drop policy if exists event_join_requests_insert on public.event_join_requests;
create policy event_join_requests_insert on public.event_join_requests
  for insert to authenticated
  with check (
    exists (
      select 1 from public.artists a
      where a.id = event_join_requests.artist_id
        and a.profile_id = (select auth.uid())
    )
    and exists (
      select 1 from public.events e
      where e.id = event_join_requests.event_id
        and e.status = 'published'
        and e.starts_at > now()
        and e.cancelled_at is null
    )
  );

drop policy if exists event_join_requests_admin on public.event_join_requests;
create policy event_join_requests_admin on public.event_join_requests
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Decisione: approva (scrive in lineup) o rifiuta, in una transazione sola.
-- ---------------------------------------------------------------------------

create or replace function public.decide_event_join_request(
  p_id uuid,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  r record;
  v_admin uuid := auth.uid();
  v_position integer;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può decidere' using errcode = '42501';
  end if;

  select jr.id, jr.event_id, jr.artist_id, jr.status,
         e.title, e.slug, e.city_key, a.name as artist_name, a.profile_id
    into r
    from public.event_join_requests jr
    join public.events e on e.id = jr.event_id
    join public.artists a on a.id = jr.artist_id
   where jr.id = p_id;

  if not found then
    raise exception 'Richiesta inesistente' using errcode = 'P0002';
  end if;

  if r.status <> 'pending' then
    raise exception 'Richiesta già decisa' using errcode = 'P0001';
  end if;

  if p_approve then
    select coalesce(max(position), 0) + 1 into v_position
      from public.event_artists where event_id = r.event_id;

    insert into public.event_artists (event_id, artist_id, position)
    values (r.event_id, r.artist_id, v_position)
    on conflict do nothing;

    if r.profile_id is not null then
      insert into public.notifications (user_id, type, title, body, href, priority, metadata)
      values (
        r.profile_id,
        'system',
        'Sei in lineup',
        'Sei stato aggiunto alla serata «' || r.title || '».',
        '/eventi/' || r.city_key || '/' || r.slug,
        'normal',
        jsonb_build_object('eventId', r.event_id, 'kind', 'lineup_approved')
      );
    end if;
  end if;

  update public.event_join_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = v_admin,
         decided_at = now()
   where id = p_id;

  return jsonb_build_object('id', p_id, 'status', case when p_approve then 'approved' else 'rejected' end);
end;
$fn$;

revoke all on function public.decide_event_join_request(uuid, boolean) from public;
grant execute on function public.decide_event_join_request(uuid, boolean) to authenticated;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0083', 'event_join_requests')
on conflict (version) do nothing;
