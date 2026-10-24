-- ============================================================================
-- OpenStage — correzione notifiche di eventi annullati più volte
-- La `dedupe_key` era solo `event-cancelled:<event_id>`: dopo la prima
-- cancellazione, ogni cancellazione successiva dello stesso evento veniva
-- scartata per sempre. Ora la chiave include il timestamp dello statement, così
-- ogni ciclo “annulla → ripubblica → annulla” produce una nuova notifica, senza
-- duplicare quella dello stesso annullamento.
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

create or replace function public.notify_event_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from new.status then
    insert into public.notifications (
      user_id, type, title, body, href, dedupe_key, priority, metadata
    )
    select
      se.profile_id,
      'event_cancelled',
      new.title,
      null,
      '/eventi/' || new.id,
      'event-cancelled:' || new.id || ':' || extract(epoch from statement_timestamp())::text,
      'normal',
      jsonb_build_object('eventId', new.id, 'eventTitle', new.title, 'startsAt', new.starts_at)
    from public.saved_events se
    where se.event_id = new.id
      and (new.created_by is null or se.profile_id <> new.created_by)
      and coalesce(
        (select np.in_app_event_cancelled from public.notification_preferences np where np.user_id = se.profile_id),
        true
      )
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  return new;
end;
$$;
