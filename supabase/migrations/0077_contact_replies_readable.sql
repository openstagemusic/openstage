-- ============================================================================
-- OpenStage - Fase 14B (le risposte ai messaggi si leggono dal sito)
--
-- Fino a ieri una risposta dell'assistenza arrivava via email e come notifica,
-- ma la notifica puntava al **form dei contatti**: la risposta non si poteva
-- leggere da nessuna parte dentro OpenStage.
--
-- Qui:
-- 1. chi ha scritto può leggere i **propri** messaggi e le risposte (la
--    corrispondenza si riconosce dall'email del profilo, la stessa che la
--    funzione usa per mandare la notifica);
-- 2. la notifica porta alla pagina giusta (`/dashboard/richieste`).
--
-- Idempotente.
-- ============================================================================

drop policy if exists contact_messages_select_own on public.contact_messages;
create policy contact_messages_select_own on public.contact_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.email) = lower(contact_messages.email)
    )
  );

drop policy if exists contact_message_replies_select_own on public.contact_message_replies;
create policy contact_message_replies_select_own on public.contact_message_replies
  for select to authenticated
  using (
    exists (
      select 1
      from public.contact_messages m
      join public.profiles p on lower(p.email) = lower(m.email)
      where m.id = contact_message_replies.message_id
        and p.id = auth.uid()
    )
  );

-- La notifica di risposta porta alla pagina dove si legge, non al modulo.
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
      '/dashboard/richieste',
      'normal',
      jsonb_build_object('messageId', p_message_id, 'replyId', v_reply_id)
    );
  end if;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    'contact_reply',
    'contact_message',
    p_message_id,
    jsonb_build_object('replyId', v_reply_id, 'notifiedProfile', v_profile)
  );

  return v_reply_id;
end;
$fn$;

revoke all on function public.admin_log_contact_reply(uuid, text) from public;
grant execute on function public.admin_log_contact_reply(uuid, text) to authenticated;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0077', 'contact_replies_readable')
on conflict (version) do nothing;
