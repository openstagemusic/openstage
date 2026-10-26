-- ============================================================================
-- OpenStage — Fase 8.8 (architettura AI assistita)
-- Registro delle esecuzioni AI: task, modello, versione prompt, token, costo,
-- esito e amministratore. Nessun input sensibile viene salvato.
--
-- L'AI non scrive mai sul database: queste righe servono solo a misurare e
-- tracciare le bozze generate per l'admin.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  task text not null,
  model text not null,
  prompt_version text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_usd numeric(12, 6) not null default 0 check (cost_usd >= 0),
  outcome text not null check (outcome in ('success', 'failed', 'blocked')),
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_runs_created_idx on public.ai_runs (created_at desc);
create index if not exists ai_runs_task_idx on public.ai_runs (task, created_at desc);

alter table public.ai_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_runs'
      and policyname = 'ai_runs_select_admin'
  ) then
    create policy ai_runs_select_admin on public.ai_runs
      for select using ((select public.is_admin()));
  end if;
end $$;

create or replace function public.admin_log_ai_run(
  p_task text,
  p_model text,
  p_prompt_version text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cost_usd numeric,
  p_outcome text,
  p_error_code text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può registrare un''esecuzione AI' using errcode = '42501';
  end if;

  if p_outcome not in ('success', 'failed', 'blocked') then
    raise exception 'Esito AI non valido' using errcode = 'P0001';
  end if;

  insert into public.ai_runs (
    actor_id, task, model, prompt_version, input_tokens, output_tokens,
    cost_usd, outcome, error_code, metadata
  )
  values (
    auth.uid(),
    left(p_task, 80),
    left(p_model, 120),
    left(p_prompt_version, 40),
    greatest(0, coalesce(p_input_tokens, 0)),
    greatest(0, coalesce(p_output_tokens, 0)),
    greatest(0, coalesce(p_cost_usd, 0)),
    p_outcome,
    left(nullif(trim(coalesce(p_error_code, '')), ''), 80),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$fn$;

revoke all on function public.admin_log_ai_run(text, text, text, integer, integer, numeric, text, text, jsonb) from public;
grant execute on function public.admin_log_ai_run(text, text, text, integer, integer, numeric, text, text, jsonb) to authenticated;

create or replace function public.admin_ai_usage()
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
    raise exception 'Solo l''amministratore può leggere l''uso AI' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'runsToday', (select count(*) from public.ai_runs where created_at >= v_start_day),
    'runsMonth', (select count(*) from public.ai_runs where created_at >= v_start_month),
    'inputTokensMonth', (select coalesce(sum(input_tokens), 0) from public.ai_runs where created_at >= v_start_month),
    'outputTokensMonth', (select coalesce(sum(output_tokens), 0) from public.ai_runs where created_at >= v_start_month),
    'costMonth', (select coalesce(sum(cost_usd), 0) from public.ai_runs where created_at >= v_start_month),
    'failedMonth', (select count(*) from public.ai_runs where outcome <> 'success' and created_at >= v_start_month),
    'lastRun', (select max(created_at) from public.ai_runs)
  );
end;
$fn$;

revoke all on function public.admin_ai_usage() from public;
grant execute on function public.admin_ai_usage() to authenticated;
