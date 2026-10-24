-- ============================================================================
-- OpenStage — Fase 7B.1 (centro notifiche in-app)
-- Notifiche lette dall'utente nella dashboard. Nessuna email automatica:
-- la cancellazione di un evento salvato produce una riga qui e basta.
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (
    type in (
      'event_cancelled',
      'event_updated',
      'event_reminder',
      'follow_new_event',
      'claim',
      'moderation',
      'system'
    )
  ),
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  dedupe_key text,
  priority text not null default 'normal' check (priority in ('critical', 'normal', 'low')),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists notifications_user_dedupe_idx
  on public.notifications (user_id, dedupe_key);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_expires_idx
  on public.notifications (expires_at);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
      and policyname = 'notifications_select_own'
  ) then
    create policy notifications_select_own on public.notifications
      for select using (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
      and policyname = 'notifications_update_own'
  ) then
    create policy notifications_update_own on public.notifications
      for update using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end $$;

-- Quando un evento passa a "cancelled", chi lo aveva salvato riceve una
-- notifica in-app. L'autore della cancellazione non viene avvisato.
create or replace function public.notify_event_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from new.status then
    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      href,
      dedupe_key,
      priority,
      metadata
    )
    select
      se.profile_id,
      'event_cancelled',
      new.title,
      null,
      '/eventi/' || new.id,
      'event-cancelled:' || new.id,
      'normal',
      jsonb_build_object(
        'eventId', new.id,
        'eventTitle', new.title,
        'startsAt', new.starts_at
      )
    from public.saved_events se
    where se.event_id = new.id
      and (new.created_by is null or se.profile_id <> new.created_by)
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists events_notify_cancelled on public.events;
create trigger events_notify_cancelled
  after update of status on public.events
  for each row
  execute function public.notify_event_cancelled();

comment on table public.notifications is
  'Centro notifiche in-app. Le email critiche restano separate; qui non si invia nulla.';
