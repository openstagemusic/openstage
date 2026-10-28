-- ============================================================================
-- OpenStage - Fase 8.11 (notice & takedown)
-- Un canale pubblico e tracciabile per segnalare un contenuto illecito o lesivo
-- di un diritto, e una coda admin per decidere e documentare l'azione.
--
-- La decisione resta umana: nessuna rimozione automatica.
-- Idempotente.
-- ============================================================================

create table if not exists public.takedown_notices (
  id uuid primary key default gen_random_uuid(),
  notice_type text not null check (
    notice_type in ('copyright', 'trademark', 'privacy', 'defamation', 'illegal', 'other')
  ),
  status text not null default 'new' check (
    status in ('new', 'reviewing', 'actioned', 'rejected')
  ),
  reporter_name text not null check (char_length(reporter_name) between 2 and 120),
  reporter_email text not null check (char_length(reporter_email) between 5 and 200),
  organization text check (organization is null or char_length(organization) <= 160),
  target_url text not null check (
    char_length(target_url) <= 500 and target_url ~* '^https?://'
  ),
  description text not null check (char_length(description) between 20 and 4000),
  evidence_url text check (
    evidence_url is null or (char_length(evidence_url) <= 500 and evidence_url ~* '^https?://')
  ),
  good_faith boolean not null default false,
  accuracy boolean not null default false,
  admin_note text check (admin_note is null or char_length(admin_note) <= 2000),
  action_taken text check (action_taken is null or char_length(action_taken) <= 1000),
  locale text not null default 'it' check (locale in ('it', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  constraint takedown_declarations check (good_faith and accuracy)
);

create index if not exists takedown_notices_created_idx
  on public.takedown_notices (created_at desc);
create index if not exists takedown_notices_status_idx
  on public.takedown_notices (status, created_at desc);

comment on table public.takedown_notices is
  'Notice & takedown: segnalazioni legali pubbliche, lette e decise solo dall''admin.';

alter table public.takedown_notices enable row level security;

drop policy if exists takedown_notices_insert_public on public.takedown_notices;
create policy takedown_notices_insert_public on public.takedown_notices
  for insert to anon, authenticated
  with check (
    status = 'new'
    and admin_note is null
    and action_taken is null
    and resolved_at is null
    and resolved_by is null
    and good_faith
    and accuracy
    and target_url ~* '^https?://'
    and (evidence_url is null or evidence_url ~* '^https?://')
  );

drop policy if exists takedown_notices_select_admin on public.takedown_notices;
create policy takedown_notices_select_admin on public.takedown_notices
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists takedown_notices_update_admin on public.takedown_notices;
create policy takedown_notices_update_admin on public.takedown_notices
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant insert on public.takedown_notices to anon, authenticated;
grant select, update on public.takedown_notices to authenticated;

drop trigger if exists takedown_notices_touch on public.takedown_notices;
create trigger takedown_notices_touch
  before update on public.takedown_notices
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Notifica in-app agli admin alla ricezione
-- ---------------------------------------------------------------------------

create or replace function public.notify_admin_takedown()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  insert into public.notifications (
    user_id, type, title, body, href, priority, dedupe_key, metadata
  )
  select
    p.id,
    'moderation',
    'Nuovo notice & takedown',
    new.notice_type || ': ' || left(new.target_url, 120),
    '/admin/takedown',
    'critical',
    'takedown:' || new.id::text,
    jsonb_build_object('noticeId', new.id, 'noticeType', new.notice_type)
  from public.profiles p
  where p.role = 'admin'
  on conflict (user_id, dedupe_key) do nothing;

  return new;
end;
$fn$;

drop trigger if exists takedown_notices_notify_admin on public.takedown_notices;
create trigger takedown_notices_notify_admin
  after insert on public.takedown_notices
  for each row execute function public.notify_admin_takedown();

-- ---------------------------------------------------------------------------
-- Decisione admin, con audit
-- ---------------------------------------------------------------------------

create or replace function public.admin_update_takedown(
  p_id uuid,
  p_status text,
  p_note text default null,
  p_action text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_old text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_action text := nullif(btrim(coalesce(p_action, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può decidere' using errcode = '42501';
  end if;

  if p_status not in ('new', 'reviewing', 'actioned', 'rejected') then
    raise exception 'Stato non valido' using errcode = 'P0001';
  end if;

  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'Nota troppo lunga' using errcode = 'P0001';
  end if;

  if v_action is not null and char_length(v_action) > 1000 then
    raise exception 'Azione troppo lunga' using errcode = 'P0001';
  end if;

  if p_status = 'actioned' and v_action is null then
    raise exception 'Indica l''azione eseguita' using errcode = 'P0001';
  end if;

  if p_status = 'rejected' and v_note is null then
    raise exception 'Indica il motivo del rifiuto' using errcode = 'P0001';
  end if;

  select status into v_old
    from public.takedown_notices
   where id = p_id
   for update;

  if not found then
    raise exception 'Notice inesistente' using errcode = 'P0002';
  end if;

  update public.takedown_notices
     set status = p_status,
         admin_note = v_note,
         action_taken = v_action,
         resolved_at = case when p_status in ('actioned', 'rejected') then now() else null end,
         resolved_by = case when p_status in ('actioned', 'rejected') then v_admin else null end
   where id = p_id;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    'takedown.' || p_status,
    'takedown',
    p_id,
    jsonb_build_object(
      'from', v_old,
      'to', p_status,
      'note', v_note,
      'action', v_action
    )
  );
end;
$fn$;

revoke all on function public.admin_update_takedown(uuid, text, text, text) from public;
grant execute on function public.admin_update_takedown(uuid, text, text, text) to authenticated;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0052', 'takedown_notices')
on conflict (version) do nothing;
