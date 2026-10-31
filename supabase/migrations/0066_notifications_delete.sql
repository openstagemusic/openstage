-- ============================================================================
-- OpenStage - Fase 11B.2b (notifiche cancellabili)
-- Ognuno cancella le proprie notifiche, una alla volta o tutte insieme.
-- Nessuna cancellazione per gli altri: la RLS guarda `user_id`.
--
-- Idempotente.
-- ============================================================================

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

insert into supabase_migrations.schema_migrations (version, name) values
  ('0066', 'notifications_delete')
on conflict (version) do nothing;
