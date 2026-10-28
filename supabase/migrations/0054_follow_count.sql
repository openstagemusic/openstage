-- ============================================================================
-- OpenStage - Fase 9A (conteggio follow)
-- Restituisce solo il numero di follower di una scheda. La tabella `follows`
-- resta privata: nessuno può leggere chi segue chi.
--
-- Funzione security definer, eseguibile da anon e authenticated.
-- Idempotente.
-- ============================================================================

create or replace function public.follow_count(
  p_subject_type text,
  p_subject_id uuid
)
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_count integer;
begin
  if p_subject_type = 'artist' then
    select count(*) into v_count
    from public.follows
    where artist_id = p_subject_id;
  elsif p_subject_type = 'venue' then
    select count(*) into v_count
    from public.follows
    where venue_id = p_subject_id;
  else
    raise exception 'Tipo di scheda non valido' using errcode = 'P0001';
  end if;

  return coalesce(v_count, 0);
end;
$fn$;

revoke all on function public.follow_count(text, uuid) from public;
grant execute on function public.follow_count(text, uuid) to anon, authenticated;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0054', 'follow_count')
on conflict (version) do nothing;
