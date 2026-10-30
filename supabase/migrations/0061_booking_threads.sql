-- ============================================================================
-- OpenStage - Fase 11B.1a (contatti e booking gratuiti)
-- 1. Thread privati artista ↔ locale, con messaggi.
-- 2. RLS: solo i due partecipanti (e l'admin) leggono e scrivono.
-- 3. Notifica in-app al destinatario per ogni messaggio; nessuna email.
-- 4. Nessun pagamento, nessun gating: il contatto è gratuito.
--
-- Idempotente.
-- ============================================================================

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'event_cancelled',
      'event_updated',
      'event_reminder',
      'follow_new_event',
      'claim',
      'moderation',
      'system',
      'booking_message'
    )
  );

create table if not exists public.booking_threads (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  event_date date,
  fee_text text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_threads_artist_idx
  on public.booking_threads (artist_id, last_message_at desc);
create index if not exists booking_threads_venue_idx
  on public.booking_threads (venue_id, last_message_at desc);

alter table public.booking_threads enable row level security;

drop policy if exists booking_threads_select_participants on public.booking_threads;
create policy booking_threads_select_participants on public.booking_threads
  for select to authenticated
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.venues v
      where v.id = venue_id and v.profile_id = (select auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists booking_threads_insert_participant on public.booking_threads;
create policy booking_threads_insert_participant on public.booking_threads
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      exists (
        select 1 from public.artists a
        where a.id = artist_id and a.profile_id = (select auth.uid())
      )
      or exists (
        select 1 from public.venues v
        where v.id = venue_id and v.profile_id = (select auth.uid())
      )
    )
  );

drop policy if exists booking_threads_update_participants on public.booking_threads;
create policy booking_threads_update_participants on public.booking_threads
  for update to authenticated
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.venues v
      where v.id = venue_id and v.profile_id = (select auth.uid())
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and a.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.venues v
      where v.id = venue_id and v.profile_id = (select auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists booking_threads_admin_delete on public.booking_threads;
create policy booking_threads_admin_delete on public.booking_threads
  for delete to authenticated
  using (public.is_admin());

create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.booking_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists booking_messages_thread_idx
  on public.booking_messages (thread_id, created_at asc);

alter table public.booking_messages enable row level security;

drop policy if exists booking_messages_select_participants on public.booking_messages;
create policy booking_messages_select_participants on public.booking_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.booking_threads t
      join public.artists a on a.id = t.artist_id
      join public.venues v on v.id = t.venue_id
      where t.id = thread_id
        and (a.profile_id = (select auth.uid()) or v.profile_id = (select auth.uid()) or public.is_admin())
    )
  );

drop policy if exists booking_messages_insert_participants on public.booking_messages;
create policy booking_messages_insert_participants on public.booking_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.booking_threads t
      join public.artists a on a.id = t.artist_id
      join public.venues v on v.id = t.venue_id
      where t.id = thread_id
        and (a.profile_id = (select auth.uid()) or v.profile_id = (select auth.uid()))
    )
  );

drop policy if exists booking_messages_admin_delete on public.booking_messages;
create policy booking_messages_admin_delete on public.booking_messages
  for delete to authenticated
  using (public.is_admin());

grant select, insert on public.booking_threads to authenticated;
grant update, delete on public.booking_threads to authenticated;
grant select, insert on public.booking_messages to authenticated;
grant delete on public.booking_messages to authenticated;

drop trigger if exists booking_threads_touch on public.booking_threads;
create trigger booking_threads_touch
  before update on public.booking_threads
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Ogni messaggio aggiorna il thread e notifica l'altra parte.
-- Nessuna email: il contatto è in-app e gratuito.
-- ---------------------------------------------------------------------------

create or replace function public.notify_booking_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_thread public.booking_threads%rowtype;
  v_artist_profile uuid;
  v_venue_profile uuid;
  v_recipient uuid;
  v_count integer;
  v_title text;
begin
  select * into v_thread from public.booking_threads where id = new.thread_id;
  if v_thread.id is null then
    return new;
  end if;

  select profile_id into v_artist_profile from public.artists where id = v_thread.artist_id;
  select profile_id into v_venue_profile from public.venues where id = v_thread.venue_id;

  if new.sender_id = v_artist_profile then
    v_recipient := v_venue_profile;
  elsif new.sender_id = v_venue_profile then
    v_recipient := v_artist_profile;
  else
    return new;
  end if;

  update public.booking_threads
  set last_message_at = now(), updated_at = now()
  where id = new.thread_id;

  if v_recipient is null then
    return new;
  end if;

  select count(*) into v_count
  from public.booking_messages
  where thread_id = new.thread_id;

  v_title := case
    when v_count = 1 then 'Nuova richiesta di booking'
    else v_thread.subject
  end;

  insert into public.notifications (
    user_id, type, title, body, href, dedupe_key, priority, metadata
  )
  values (
    v_recipient,
    'booking_message',
    v_title,
    left(new.body, 140),
    '/dashboard/messaggi/' || new.thread_id,
    'booking-msg:' || new.id,
    'normal',
    jsonb_build_object('threadId', new.thread_id)
  )
  on conflict (user_id, dedupe_key) do nothing;

  return new;
end;
$fn$;

drop trigger if exists booking_messages_notify on public.booking_messages;
create trigger booking_messages_notify
  after insert on public.booking_messages
  for each row execute function public.notify_booking_message();

comment on table public.booking_threads is
  'Contatti/booking gratuiti tra artista e locale. Nessun gating, nessun pagamento.';
comment on table public.booking_messages is
  'Messaggi del thread di booking; accesso solo ai due partecipanti e all''admin.';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0061', 'booking_threads')
on conflict (version) do nothing;
