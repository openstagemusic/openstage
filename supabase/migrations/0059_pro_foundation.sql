-- ============================================================================
-- OpenStage - Fase 11A (fondazioni Pro)
-- 1. `pro_entitlements`: accesso Pro a tempo, senza `is_pro` sul profilo.
-- 2. `pro_feature_requests`: il box "richiesta strumento" riservato ai Pro.
-- 3. RLS: l'utente vede solo il proprio accesso e le proprie richieste; l'admin
--    gestisce accessi e coda. L'utente non può auto-assegnarsi il Pro.
--
-- Nessun pagamento: gli accessi si concedono a mano dall'admin finché non arriva
-- la 11C. Idempotente.
-- ============================================================================

create table if not exists public.pro_entitlements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('artist', 'venue')),
  status text not null default 'active' check (status in ('active', 'expired', 'refunded', 'revoked')),
  starts_at timestamptz not null default now(),
  valid_until timestamptz not null,
  source text not null default 'manual' check (source in ('manual', 'paypal')),
  provider_order_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pro_entitlements_range check (valid_until > starts_at)
);

create index if not exists pro_entitlements_profile_idx
  on public.pro_entitlements (profile_id, status, valid_until desc);
create index if not exists pro_entitlements_status_idx
  on public.pro_entitlements (status, valid_until);

alter table public.pro_entitlements enable row level security;

drop policy if exists pro_entitlements_select_own on public.pro_entitlements;
create policy pro_entitlements_select_own on public.pro_entitlements
  for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists pro_entitlements_admin_insert on public.pro_entitlements;
create policy pro_entitlements_admin_insert on public.pro_entitlements
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists pro_entitlements_admin_update on public.pro_entitlements;
create policy pro_entitlements_admin_update on public.pro_entitlements
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists pro_entitlements_admin_delete on public.pro_entitlements;
create policy pro_entitlements_admin_delete on public.pro_entitlements
  for delete to authenticated
  using (public.is_admin());

grant select on public.pro_entitlements to authenticated;
grant insert, update, delete on public.pro_entitlements to authenticated;

drop trigger if exists pro_entitlements_touch on public.pro_entitlements;
create trigger pro_entitlements_touch
  before update on public.pro_entitlements
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Box "richiesta strumento"
-- ---------------------------------------------------------------------------

create table if not exists public.pro_feature_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  area text not null check (area in ('analytics', 'export', 'epk', 'booking', 'widget', 'other')),
  title text not null,
  problem text not null,
  use_case text not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'planned', 'released', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pro_feature_requests_profile_idx
  on public.pro_feature_requests (profile_id, created_at desc);
create index if not exists pro_feature_requests_status_idx
  on public.pro_feature_requests (status, created_at desc);

alter table public.pro_feature_requests enable row level security;

drop policy if exists pro_feature_requests_select_own on public.pro_feature_requests;
create policy pro_feature_requests_select_own on public.pro_feature_requests
  for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists pro_feature_requests_insert_pro on public.pro_feature_requests;
create policy pro_feature_requests_insert_pro on public.pro_feature_requests
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.pro_entitlements e
      where e.profile_id = (select auth.uid())
        and e.status = 'active'
        and e.valid_until > now()
    )
  );

drop policy if exists pro_feature_requests_admin_update on public.pro_feature_requests;
create policy pro_feature_requests_admin_update on public.pro_feature_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists pro_feature_requests_admin_delete on public.pro_feature_requests;
create policy pro_feature_requests_admin_delete on public.pro_feature_requests
  for delete to authenticated
  using (public.is_admin());

grant select, insert on public.pro_feature_requests to authenticated;
grant update, delete on public.pro_feature_requests to authenticated;

drop trigger if exists pro_feature_requests_touch on public.pro_feature_requests;
create trigger pro_feature_requests_touch
  before update on public.pro_feature_requests
  for each row execute function public.touch_updated_at();

comment on table public.pro_entitlements is
  'Accesso Pro a tempo. Nessun is_pro sul profilo: lo stato si calcola da qui.';
comment on table public.pro_feature_requests is
  'Richieste di strumenti inviate dai Pro. Non sono promesse di sviluppo.';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0059', 'pro_foundation')
on conflict (version) do nothing;
