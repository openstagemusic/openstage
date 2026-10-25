-- ============================================================================
-- OpenStage — Fase 8.5 (centro assistenza)
-- I messaggi del form contatti diventano ticket veri: priorità, assegnazione,
-- storico delle risposte e notifica in-app a chi ha un account.
--
-- La risposta email resta transazionale (Resend, inviata dall'azione server).
-- Qui si registra la risposta, si aggiorna il ticket e si avvisa l'utente.
--
-- Idempotente.
-- ============================================================================

alter table public.contact_messages
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists assigned_to uuid references public.profiles (id) on delete set null;

create index if not exists contact_messages_priority_idx
  on public.contact_messages (priority, created_at desc);
create index if not exists contact_messages_assigned_idx
  on public.contact_messages (assigned_to, status);

create table if not exists public.contact_message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.contact_messages (id) on delete cascade,
  admin_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 10 and 4000),
  sent_at timestamptz not null default now()
);

create index if not exists contact_message_replies_message_idx
  on public.contact_message_replies (message_id, sent_at);

alter table public.contact_message_replies enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contact_message_replies'
      and policyname = 'contact_message_replies_select_admin'
  ) then
    create policy contact_message_replies_select_admin on public.contact_message_replies
      for select using ((select public.is_admin()));
  end if;
end $$;

create or replace function public.admin_update_contact_ticket(
  p_message_id uuid,
  p_priority text,
  p_assigned_to uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_priority text := coalesce(nullif(trim(p_priority), ''), 'normal');
  v_message public.contact_messages;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può gestire un ticket' using errcode = '42501';
  end if;

  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Priorità non valida' using errcode = 'P0001';
  end if;

  if p_assigned_to is not null and not exists (
    select 1 from public.profiles where id = p_assigned_to and role = 'admin'
  ) then
    raise exception 'Assegnazione non valida' using errcode = 'P0001';
  end if;

  select * into v_message from public.contact_messages where id = p_message_id for update;
  if not found then
    raise exception 'Ticket inesistente' using errcode = 'P0002';
  end if;

  update public.contact_messages
     set priority = v_priority,
         assigned_to = p_assigned_to
   where id = p_message_id;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    'ticket.update',
    'contact_message',
    p_message_id,
    jsonb_build_object(
      'priority', v_priority,
      'assignedTo', p_assigned_to
    )
  );
end;
$fn$;

revoke all on function public.admin_update_contact_ticket(uuid, text, uuid) from public;
grant execute on function public.admin_update_contact_ticket(uuid, text, uuid) to authenticated;

create or replace function public.admin_log_contact_reply(
  p_message_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_message public.contact_messages;
  v_reply_id uuid;
  v_profile uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può rispondere' using errcode = '42501';
  end if;

  if char_length(v_body) < 10 or char_length(v_body) > 4000 then
    raise exception 'Risposta non valida' using errcode = 'P0001';
  end if;

  select * into v_message from public.contact_messages where id = p_message_id for update;
  if not found then
    raise exception 'Ticket inesistente' using errcode = 'P0002';
  end if;

  insert into public.contact_message_replies (message_id, admin_id, body)
  values (p_message_id, v_admin, v_body)
  returning id into v_reply_id;

  update public.contact_messages
     set status = case when status = 'closed' then status else 'read' end,
         read_at = coalesce(read_at, now())
   where id = p_message_id;

  select id into v_profile from public.profiles
   where lower(email) = lower(v_message.email) limit 1;

  if v_profile is not null then
    insert into public.notifications (user_id, type, title, body, href, priority, metadata)
    values (
      v_profile,
      'system',
      'Risposta al tuo messaggio',
      left(v_body, 180),
      '/contatti',
      'normal',
      jsonb_build_object('messageId', p_message_id, 'replyId', v_reply_id)
    );
  end if;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    'ticket.reply',
    'contact_message',
    p_message_id,
    jsonb_build_object('replyId', v_reply_id, 'notifiedProfile', v_profile)
  );

  return v_reply_id;
end;
$fn$;

revoke all on function public.admin_log_contact_reply(uuid, text) from public;
grant execute on function public.admin_log_contact_reply(uuid, text) to authenticated;
