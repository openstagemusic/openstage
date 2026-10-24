-- ============================================================================
-- OpenStage — Fase 7B.2 (coda email)
-- Le email non critiche passano da qui. Auth e risposte 1:1 restano inviate
-- direttamente da `lib/email.ts`; questa coda serve a digest e avvisi opzionali.
--
-- RLS attiva senza policy: solo il service role (worker) può leggere/scrivere.
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  from_email text not null,
  reply_to text,
  subject text not null,
  text_body text not null,
  html_body text,
  category text not null check (category in ('auth', 'transactional', 'digest', 'optional')),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  provider_id text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create unique index if not exists email_queue_idempotency_idx
  on public.email_queue (idempotency_key);

create index if not exists email_queue_pending_idx
  on public.email_queue (status, next_attempt_at, created_at);

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.email_queue (id) on delete set null,
  category text not null,
  to_email text not null,
  subject text not null,
  status text not null check (status in ('sent', 'failed', 'delivered', 'bounced', 'complained')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists email_log_provider_idx
  on public.email_log (provider_id);

create index if not exists email_log_created_idx
  on public.email_log (created_at desc);

alter table public.email_queue enable row level security;
alter table public.email_log enable row level security;

-- Prende un lotto di email da inviare e le marca subito come `sending`.
-- `skip locked` evita che due worker prendano la stessa riga.
create or replace function public.claim_email_batch(p_limit integer default 10)
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

comment on table public.email_queue is
  'Coda email non critiche. Auth e risposte 1:1 restano inviate direttamente.';
comment on table public.email_log is
  'Registro invii e webhook Resend, senza corpi email né dati sensibili.';
