-- ============================================================================
-- OpenStage — Fase 7B.3a (preferenze notifiche)
-- L'utente decide quali notifiche in-app ricevere e se attivare il digest.
-- Le notifiche di sicurezza restano sempre attive e non compaiono qui.
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  in_app_event_cancelled boolean not null default true,
  in_app_event_updated boolean not null default true,
  in_app_follows boolean not null default true,
  email_digest boolean not null default false,
  email_urgent boolean not null default false,
  locale text not null default 'it' check (locale in ('it', 'en')),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notification_preferences'
      and policyname = 'notification_preferences_select_own'
  ) then
    create policy notification_preferences_select_own on public.notification_preferences
      for select using (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notification_preferences'
      and policyname = 'notification_preferences_insert_own'
  ) then
    create policy notification_preferences_insert_own on public.notification_preferences
      for insert with check (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notification_preferences'
      and policyname = 'notification_preferences_update_own'
  ) then
    create policy notification_preferences_update_own on public.notification_preferences
      for update using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end $$;

-- Stessa cancellazione, ma rispetta la preferenza in-app dell'utente.
create or replace function public.notify_event_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from new.status then
    insert into public.notifications (
      user_id, type, title, body, href, dedupe_key, priority, metadata
    )
    select
      se.profile_id,
      'event_cancelled',
      new.title,
      null,
      '/eventi/' || new.id,
      'event-cancelled:' || new.id,
      'normal',
      jsonb_build_object('eventId', new.id, 'eventTitle', new.title, 'startsAt', new.starts_at)
    from public.saved_events se
    where se.event_id = new.id
      and (new.created_by is null or se.profile_id <> new.created_by)
      and coalesce(
        (select np.in_app_event_cancelled from public.notification_preferences np where np.user_id = se.profile_id),
        true
      )
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  return new;
end;
$$;
