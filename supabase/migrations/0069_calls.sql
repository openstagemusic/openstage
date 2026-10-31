-- ============================================================================
-- OpenStage - Fase 12.2 (bacheca ingaggi)
-- Un locale (o un artista) pubblica una chiamata: ruolo cercato, periodo,
-- compenso dichiarato, scadenza e un tetto di candidature scelto dall'autore.
-- La candidatura è un thread di booking: nessun secondo sistema di messaggi.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid references public.venues (id) on delete cascade,
  artist_id uuid references public.artists (id) on delete cascade,
  title text not null check (char_length(title) between 4 and 120),
  body text not null check (char_length(body) between 30 and 2000),
  role_wanted text not null check (
    role_wanted in ('artist', 'band', 'dj', 'performer', 'technician', 'other')
  ),
  city text,
  period_start date,
  period_end date,
  fee_text text check (fee_text is null or char_length(fee_text) <= 120),
  compensation text not null check (
    compensation in ('paid', 'door_split', 'unpaid', 'tbd')
  ),
  max_applications integer not null default 10 check (max_applications between 1 and 50),
  status text not null default 'open' check (status in ('open', 'closed')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calls_one_owner check ((venue_id is not null) <> (artist_id is not null)),
  constraint calls_period check (
    period_end is null or period_start is null or period_end >= period_start
  )
);

create index if not exists calls_open_idx
  on public.calls (status, expires_at, city);

-- Una sola chiamata aperta per scheda: due annunci identici non aiutano nessuno.
create unique index if not exists calls_one_open_per_venue
  on public.calls (venue_id) where status = 'open' and venue_id is not null;
create unique index if not exists calls_one_open_per_artist
  on public.calls (artist_id) where status = 'open' and artist_id is not null;

alter table public.calls enable row level security;

drop policy if exists calls_select_public on public.calls;
create policy calls_select_public on public.calls
  for select to anon, authenticated
  using ((status = 'open' and expires_at > now()) or public.is_admin());

drop policy if exists calls_select_owner on public.calls;
create policy calls_select_owner on public.calls
  for select to authenticated
  using (created_by = auth.uid());

drop policy if exists calls_insert_verified on public.calls;
create policy calls_insert_verified on public.calls
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verified_at is not null
    )
    and (
      (
        venue_id is not null
        and exists (
          select 1 from public.venues v
          where v.id = calls.venue_id and v.profile_id = auth.uid() and v.closed_at is null
        )
      )
      or (
        artist_id is not null
        and exists (
          select 1 from public.artists a
          where a.id = calls.artist_id and a.profile_id = auth.uid()
        )
      )
    )
  );

drop policy if exists calls_update_own on public.calls;
create policy calls_update_own on public.calls
  for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists calls_delete_own on public.calls;
create policy calls_delete_own on public.calls
  for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

drop trigger if exists calls_touch on public.calls;
create trigger calls_touch
  before update on public.calls
  for each row execute function public.touch_updated_at();

-- La candidatura vive nel booking, con un riferimento alla chiamata.
alter table public.booking_threads
  add column if not exists call_id uuid references public.calls (id) on delete set null;

create index if not exists booking_threads_call_idx
  on public.booking_threads (call_id) where call_id is not null;

-- Una candidatura per profilo per chiamata.
create unique index if not exists booking_threads_one_application
  on public.booking_threads (call_id, created_by) where call_id is not null;

-- Tetto e scadenza controllati dal database: due candidature simultanee non
-- possono superare il numero scelto dall'autore.
create or replace function public.enforce_call_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_status text;
  v_expires timestamptz;
  v_max integer;
  v_count integer;
begin
  if new.call_id is null then
    return new;
  end if;

  select status, expires_at, max_applications
    into v_status, v_expires, v_max
    from public.calls
   where id = new.call_id
   for update;

  if not found then
    raise exception 'call_not_found';
  end if;

  if v_status <> 'open' or v_expires <= now() then
    raise exception 'call_closed';
  end if;

  select count(*) into v_count
    from public.booking_threads
   where call_id = new.call_id;

  if v_count >= v_max then
    raise exception 'call_full';
  end if;

  return new;
end;
$fn$;

drop trigger if exists booking_threads_call_capacity on public.booking_threads;
create trigger booking_threads_call_capacity
  before insert on public.booking_threads
  for each row execute function public.enforce_call_capacity();

comment on table public.calls is
  'Bacheca ingaggi: annunci verificati con compenso dichiarato e tetto di candidature.';
comment on column public.calls.expires_at is
  'Dopo questa data la chiamata non è più visibile né candidabile (nessun cron).';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0069', 'calls')
on conflict (version) do nothing;
