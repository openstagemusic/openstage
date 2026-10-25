-- ============================================================================
-- OpenStage — Fase 8.4 (ricerca control room e notifiche sospensione)
-- 1. `admin_search()`: una sola ricerca su persone, schede, eventi, messaggi,
--    email e segnalazioni. Solo admin, risultati limitati.
-- 2. `admin_set_user_suspended()`: oltre all'audit, avvisa la persona con una
--    notifica in-app e mette in coda l'email transazionale.
--
-- Idempotente.
-- ============================================================================

create or replace function public.admin_search(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_raw text := trim(coalesce(p_query, ''));
  v_q text := lower(v_raw);
  v_like text;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può cercare' using errcode = '42501';
  end if;

  if char_length(v_q) < 2 then
    return jsonb_build_object(
      'query', v_raw,
      'users', '[]'::jsonb,
      'artists', '[]'::jsonb,
      'venues', '[]'::jsonb,
      'events', '[]'::jsonb,
      'messages', '[]'::jsonb,
      'emails', '[]'::jsonb,
      'reports', '[]'::jsonb
    );
  end if;

  v_like := '%' || v_q || '%';

  return jsonb_build_object(
    'query', v_raw,
    'users', coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select id, email, full_name, role, verified_at, suspended_at
        from public.profiles
        where lower(coalesce(email, '')) like v_like
           or lower(coalesce(full_name, '')) like v_like
        order by created_at desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'artists', coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select id, name, slug, city, genre, profile_id
        from public.artists
        where lower(coalesce(name, '')) like v_like
           or lower(coalesce(city, '')) like v_like
           or lower(coalesce(genre, '')) like v_like
        order by created_at desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'venues', coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select id, name, slug, city, address, profile_id
        from public.venues
        where lower(coalesce(name, '')) like v_like
           or lower(coalesce(city, '')) like v_like
           or lower(coalesce(address, '')) like v_like
        order by created_at desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select id, title, slug, city, status, starts_at
        from public.events
        where lower(coalesce(title, '')) like v_like
           or lower(coalesce(city, '')) like v_like
           or lower(coalesce(venue_name, '')) like v_like
        order by created_at desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select id, name, email, topic, status, created_at, left(message, 160) as preview
        from public.contact_messages
        where lower(coalesce(name, '')) like v_like
           or lower(coalesce(email, '')) like v_like
           or lower(coalesce(message, '')) like v_like
        order by created_at desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'emails', coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select id, to_email, subject, status, created_at
        from public.email_queue
        where lower(coalesce(to_email, '')) like v_like
           or lower(coalesce(subject, '')) like v_like
        order by created_at desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select r.id, r.reason, r.status, r.created_at, r.note,
               e.title as event_title, e.slug as event_slug, e.city as event_city
        from public.reports r
        join public.events e on e.id = r.event_id
        where lower(coalesce(r.note, '')) like v_like
           or lower(coalesce(e.title, '')) like v_like
        order by r.created_at desc
        limit 8
      ) x
    ), '[]'::jsonb)
  );
end;
$fn$;

revoke all on function public.admin_search(text) from public;
grant execute on function public.admin_search(text) to authenticated;

create or replace function public.admin_set_user_suspended(
  p_profile_id uuid,
  p_suspended boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_target public.profiles;
  v_now timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può sospendere un account' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'Profilo inesistente' using errcode = 'P0002';
  end if;
  if v_target.role = 'admin' then
    raise exception 'Un amministratore non può essere sospeso' using errcode = 'P0001';
  end if;
  if v_target.id = v_admin then
    raise exception 'Non puoi sospendere il tuo account' using errcode = 'P0001';
  end if;

  update public.profiles
     set suspended_at = case when p_suspended then v_now else null end
   where id = p_profile_id;

  insert into public.notifications (user_id, type, title, body, href, priority, metadata)
  values (
    p_profile_id,
    case when p_suspended then 'moderation' else 'system' end,
    case when p_suspended then 'Account sospeso' else 'Account ripristinato' end,
    case when p_suspended
      then 'Il tuo account OpenStage è stato sospeso e non può creare nuovi eventi. Per chiarimenti usa il modulo contatti.'
      else 'Il tuo account OpenStage è stato ripristinato. Puoi di nuovo creare eventi.'
    end,
    case when p_suspended then '/contatti' else '/dashboard' end,
    case when p_suspended then 'critical' else 'normal' end,
    jsonb_build_object('reason', nullif(trim(coalesce(p_note, '')), ''))
  );

  if v_target.email is not null and trim(v_target.email) <> '' then
    insert into public.email_queue (
      to_email, from_email, subject, text_body, category, idempotency_key, metadata
    )
    values (
      v_target.email,
      'OpenStage <noreply@getopenstage.it>',
      case when p_suspended then 'Il tuo account OpenStage è stato sospeso' else 'Il tuo account OpenStage è stato ripristinato' end,
      case when p_suspended
        then 'Ciao,' || chr(10) || chr(10) ||
             'il tuo account OpenStage è stato sospeso. Non puoi creare nuovi eventi finché la sospensione resta attiva.' || chr(10) || chr(10) ||
             'Se pensi sia un errore, rispondi a questa email o scrivici dal modulo contatti: https://getopenstage.it/contatti' || chr(10) || chr(10) ||
             'OpenStage'
        else 'Ciao,' || chr(10) || chr(10) ||
             'il tuo account OpenStage è stato ripristinato. Puoi di nuovo creare eventi.' || chr(10) || chr(10) ||
             'OpenStage'
      end,
      'transactional',
      case when p_suspended then 'user-suspend:' else 'user-restore:' end || p_profile_id::text || ':' || extract(epoch from v_now)::text,
      jsonb_build_object('profileId', p_profile_id, 'action', case when p_suspended then 'suspend' else 'restore' end)
    )
    on conflict (idempotency_key) do nothing;
  end if;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    case when p_suspended then 'user.suspend' else 'user.restore' end,
    'profile',
    p_profile_id,
    jsonb_build_object(
      'email', v_target.email,
      'role', v_target.role,
      'note', nullif(trim(coalesce(p_note, '')), '')
    )
  );
end;
$fn$;

revoke all on function public.admin_set_user_suspended(uuid, boolean, text) from public;
grant execute on function public.admin_set_user_suspended(uuid, boolean, text) to authenticated;
