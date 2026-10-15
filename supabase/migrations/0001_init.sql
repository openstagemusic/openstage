-- ============================================================================
-- OpenStage — Fase 1
-- Schema iniziale + Row Level Security (RLS)
--
-- Eseguire UNA VOLTA nel SQL Editor di Supabase.
-- Idempotente: può essere rieseguito senza errori.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('fan', 'artist', 'venue', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum ('draft', 'published', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'fan',
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null,
  city text,
  genre text,
  spotify_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null,
  city text,
  address text,
  latitude double precision,
  longitude double precision,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  artist_id uuid references public.artists (id) on delete set null,
  venue_id uuid references public.venues (id) on delete set null,
  starts_at timestamptz not null,
  city text,
  is_unclaimed boolean not null default false,
  status public.event_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_city_idx on public.events (city);

-- ---------------------------------------------------------------------------
-- Seed
-- The admin email lives in the database (never hardcoded in the app).
-- Replace the placeholder below with your real address:
--   update public.settings set value = 'you@example.com' where key = 'admin_email';
-- ---------------------------------------------------------------------------
insert into public.settings (key, value)
values ('admin_email', 'change-me@example.com')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.settings
    where key = 'admin_email'
      and lower(value) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Keeps updated_at fresh and blocks any attempt to change your own role
-- (upleveling to admin is only possible through the settings table).
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Every new auth user gets a profile; the role comes from the sign-up metadata
-- and is validated here (never trusted from the client).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role public.user_role;
begin
  v_role := case
    when v_meta ->> 'role' in ('artist', 'venue') then (v_meta ->> 'role')::public.user_role
    else 'fan'
  end;

  insert into public.profiles (id, email, full_name, role, city)
  values (
    new.id,
    new.email,
    nullif(v_meta ->> 'full_name', ''),
    v_role,
    nullif(v_meta ->> 'city', '')
  )
  on conflict (id) do nothing;

  if exists (
    select 1 from public.settings
    where key = 'admin_email' and lower(value) = lower(new.email)
  ) then
    update public.profiles set role = 'admin' where id = new.id;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

drop trigger if exists artists_touch on public.artists;
create trigger artists_touch
  before update on public.artists
  for each row execute function public.touch_updated_at();

drop trigger if exists venues_touch on public.venues;
create trigger venues_touch
  before update on public.venues
  for each row execute function public.touch_updated_at();

drop trigger if exists events_touch on public.events;
create trigger events_touch
  before update on public.events
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch
  before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;

-- settings — admin only
drop policy if exists settings_select_admin on public.settings;
create policy settings_select_admin on public.settings
  for select using (public.is_admin());

drop policy if exists settings_update_admin on public.settings;
create policy settings_update_admin on public.settings
  for update using (public.is_admin()) with check (public.is_admin());

-- profiles — own row, or admin
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- artists — public read, owners write
drop policy if exists artists_select_public on public.artists;
create policy artists_select_public on public.artists
  for select using (true);

drop policy if exists artists_insert_own on public.artists;
create policy artists_insert_own on public.artists
  for insert with check (auth.uid() = profile_id);

drop policy if exists artists_update_own on public.artists;
create policy artists_update_own on public.artists
  for update using (auth.uid() = profile_id or public.is_admin())
  with check (auth.uid() = profile_id or public.is_admin());

drop policy if exists artists_delete_own on public.artists;
create policy artists_delete_own on public.artists
  for delete using (auth.uid() = profile_id or public.is_admin());

-- venues — public read, owners write
drop policy if exists venues_select_public on public.venues;
create policy venues_select_public on public.venues
  for select using (true);

drop policy if exists venues_insert_own on public.venues;
create policy venues_insert_own on public.venues
  for insert with check (auth.uid() = profile_id);

drop policy if exists venues_update_own on public.venues;
create policy venues_update_own on public.venues
  for update using (auth.uid() = profile_id or public.is_admin())
  with check (auth.uid() = profile_id or public.is_admin());

drop policy if exists venues_delete_own on public.venues;
create policy venues_delete_own on public.venues
  for delete using (auth.uid() = profile_id or public.is_admin());

-- events — published are public, drafts stay with their creator
drop policy if exists events_select_public on public.events;
create policy events_select_public on public.events
  for select using (
    status = 'published'
    or created_by = auth.uid()
    or public.is_admin()
  );

drop policy if exists events_insert_authenticated on public.events;
create policy events_insert_authenticated on public.events
  for insert to authenticated
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists events_update_own on public.events;
create policy events_update_own on public.events
  for update using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists events_delete_own on public.events;
create policy events_delete_own on public.events
  for delete using (created_by = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants (RLS still applies on top of these)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.artists, public.venues, public.events to anon;
grant select, insert, update, delete on public.profiles, public.artists, public.venues, public.events to authenticated;
grant select, update on public.settings to authenticated;
