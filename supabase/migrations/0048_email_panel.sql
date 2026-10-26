-- ============================================================================
-- OpenStage — Fase 8.6 (pannello comunicazione)
-- Registro batch, quota e retry controllato. Nessuna newsletter, nessun
-- tracking: solo email transazionali, digest opt-in e avvisi opzionali.
--
-- Idempotente.
-- ============================================================================

alter table public.email_queue
  add column if not exists batch_id uuid,
  add column if not exists recipient_count integer not null default 1
    check (recipient_count >= 1);

alter table public.email_log
  add column if not exists batch_id uuid,
  add column if not exists recipient_count integer not null default 1
    check (recipient_count >= 1);

create index if not exists email_queue_batch_idx on public.email_queue (batch_id);
create index if not exists email_log_batch_idx on public.email_log (batch_id);
create index if not exists email_log_status_created_idx on public.email_log (status, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'email_queue'
      and policyname = 'email_queue_select_admin'
  ) then
    create policy email_queue_select_admin on public.email_queue
      for select using ((select public.is_admin()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'email_log'
      and policyname = 'email_log_select_admin'
  ) then
    create policy email_log_select_admin on public.email_log
      for select using ((select public.is_admin()));
  end if;
end $$;

drop function if exists public.claim_email_batch(integer);

create or replace function public.claim_email_batch(
  p_limit integer default 10,
  p_categories text[] default null
)
returns setof public.email_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select id
    from public.email_queue
    where status = 'pending'
      and next_attempt_at <= now()
      and (p_categories is null or category = any(p_categories))
    order by created_at asc
    limit greatest(1, least(p_limit, 50))
    for update skip locked
  )
  update public.email_queue q
  set status = 'sending',
      attempts = q.attempts + 1,
      updated_at = now()
  from picked
  where q.id = picked.id
  returning q.*;
end;
$$;

create or replace function public.admin_email_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_start_day timestamptz := date_trunc('day', now());
  v_start_month timestamptz := date_trunc('month', now());
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può leggere le statistiche email' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'queued', (select count(*) from public.email_queue where status = 'pending'),
    'sending', (select count(*) from public.email_queue where status = 'sending'),
    'failed', (select count(*) from public.email_queue where status = 'failed'),
    'cancelled', (select count(*) from public.email_queue where status = 'cancelled'),
    'sentToday', (select count(*) from public.email_log where status in ('sent', 'delivered') and created_at >= v_start_day),
    'sentMonth', (select count(*) from public.email_log where status in ('sent', 'delivered') and created_at >= v_start_month),
    'failedToday', (select count(*) from public.email_log where status = 'failed' and created_at >= v_start_day),
    'deliveredMonth', (select count(*) from public.email_log where status = 'delivered' and created_at >= v_start_month),
    'bouncedMonth', (select count(*) from public.email_log where status = 'bounced' and created_at >= v_start_month),
    'complainedMonth', (select count(*) from public.email_log where status = 'complained' and created_at >= v_start_month),
    'byCategory', (
      select coalesce(jsonb_object_agg(category, total), '{}'::jsonb)
      from (
        select category, count(*) as total
        from public.email_log
        where created_at >= v_start_month
        group by category
      ) x
    )
  );
end;
$fn$;

revoke all on function public.admin_email_stats() from public;
grant execute on function public.admin_email_stats() to authenticated;

create or replace function public.admin_retry_email_queue(
  p_ids uuid[] default null,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_count integer;
  v_categories jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può riprovare le email' using errcode = '42501';
  end if;

  select count(*), coalesce(jsonb_object_agg(category, total), '{}'::jsonb)
    into v_count, v_categories
  from (
    select category, count(*) as total
    from public.email_queue
    where status = 'failed'
      and (p_ids is null or id = any(p_ids))
    group by category
  ) x;

  if p_dry_run then
    return jsonb_build_object('count', v_count, 'categories', v_categories, 'dryRun', true);
  end if;

  update public.email_queue
     set status = 'pending',
         attempts = 0,
         next_attempt_at = now(),
         last_error = null,
         updated_at = now()
   where status = 'failed'
     and (p_ids is null or id = any(p_ids));

  insert into public.admin_audit_log (actor_id, action, subject_type, metadata)
  values (
    v_admin,
    'email.retry',
    'email_queue',
    jsonb_build_object('count', v_count, 'categories', v_categories, 'ids', p_ids)
  );

  return jsonb_build_object('count', v_count, 'categories', v_categories, 'dryRun', false);
end;
$fn$;

revoke all on function public.admin_retry_email_queue(uuid[], boolean) from public;
grant execute on function public.admin_retry_email_queue(uuid[], boolean) to authenticated;
