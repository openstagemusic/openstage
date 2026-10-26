-- ============================================================================
-- OpenStage — Fase 8.7 (notifiche in-app, vista admin)
-- L'admin può leggere le notifiche recenti, vedere i conteggi reali e inviare
-- un messaggio manuale solo con target esplicito e anteprima.
--
-- Nessun broadcast: il target è un singolo utente o un ruolo, con conteggio
-- mostrato prima dell'invio. Nessuna email parte da qui.
--
-- Idempotente.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
      and policyname = 'notifications_select_admin'
  ) then
    create policy notifications_select_admin on public.notifications
      for select using ((select public.is_admin()));
  end if;
end $$;

create or replace function public.admin_notification_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_start_week timestamptz := now() - interval '7 days';
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può leggere le notifiche' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total', (select count(*) from public.notifications),
    'unread', (select count(*) from public.notifications where read_at is null),
    'read', (select count(*) from public.notifications where read_at is not null),
    'lastWeek', (select count(*) from public.notifications where created_at >= v_start_week),
    'byType', (
      select coalesce(jsonb_object_agg(type, total), '{}'::jsonb)
      from (
        select type, count(*) as total
        from public.notifications
        group by type
      ) x
    )
  );
end;
$fn$;

revoke all on function public.admin_notification_stats() from public;
grant execute on function public.admin_notification_stats() to authenticated;

create or replace function public.admin_send_manual_notification(
  p_user_id uuid,
  p_role text,
  p_title text,
  p_body text,
  p_href text default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_href text := nullif(btrim(coalesce(p_href, '')), '');
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può inviare notifiche' using errcode = '42501';
  end if;

  if char_length(v_title) < 3 or char_length(v_title) > 120 then
    raise exception 'Titolo non valido' using errcode = 'P0001';
  end if;

  if char_length(v_body) < 5 or char_length(v_body) > 1000 then
    raise exception 'Testo non valido' using errcode = 'P0001';
  end if;

  if v_href is not null and left(v_href, 1) <> '/' then
    raise exception 'Il link deve essere un percorso interno' using errcode = 'P0001';
  end if;

  if (p_user_id is null) = (p_role is null) then
    raise exception 'Serve un solo target: utente oppure ruolo' using errcode = 'P0001';
  end if;

  if p_role is not null and p_role not in ('fan', 'artist', 'venue', 'admin') then
    raise exception 'Ruolo non valido' using errcode = 'P0001';
  end if;

  if p_user_id is not null then
    if not exists (select 1 from public.profiles where id = p_user_id) then
      raise exception 'Profilo inesistente' using errcode = 'P0002';
    end if;

    insert into public.notifications (
      user_id, type, title, body, href, priority, metadata
    )
    values (
      p_user_id, 'system', v_title, v_body, v_href, 'normal',
      jsonb_build_object('source', 'admin_manual', 'actor', v_admin)
    );

    v_count := 1;
  else
    select count(*) into v_count from public.profiles where role::text = p_role;

    if v_count = 0 then
      raise exception 'Nessun destinatario per questo ruolo' using errcode = 'P0001';
    end if;

    if v_count > 5000 then
      raise exception 'Target troppo ampio: invio manuale bloccato' using errcode = 'P0001';
    end if;

    insert into public.notifications (
      user_id, type, title, body, href, priority, metadata
    )
    select
      p.id, 'system', v_title, v_body, v_href, 'normal',
      jsonb_build_object('source', 'admin_manual', 'actor', v_admin, 'role', p_role)
    from public.profiles p
    where p.role::text = p_role;
  end if;

  insert into public.admin_audit_log (actor_id, action, subject_type, metadata)
  values (
    v_admin,
    'notification.manual',
    'notification',
    jsonb_build_object(
      'userId', p_user_id,
      'role', p_role,
      'count', v_count,
      'title', v_title
    )
  );

  return v_count;
end;
$fn$;

revoke all on function public.admin_send_manual_notification(uuid, text, text, text, text) from public;
grant execute on function public.admin_send_manual_notification(uuid, text, text, text, text) to authenticated;
