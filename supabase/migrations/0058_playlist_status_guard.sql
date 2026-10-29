-- ============================================================================
-- OpenStage - Fase 10E (protezione della coda playlist)
-- L'artista può proporre un nuovo brano o ritirare il proprio, ma NON può
-- dichiararlo "aggiunto" né scartarlo: l'esito lo registra solo l'admin.
--
-- Idempotente.
-- ============================================================================

create or replace function public.guard_playlist_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if public.is_admin() then
    return new;
  end if;

  -- Ritiro della proposta: si azzera tutto, ed è permesso.
  if new.playlist_track_url is null then
    if new.playlist_track_status is not null or new.playlist_track_added_at is not null then
      raise exception 'Solo lo staff può cambiare l''esito della proposta'
        using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- Brano nuovo: si riparte da "in valutazione", senza esito precedente.
  if new.playlist_track_url is distinct from old.playlist_track_url then
    if new.playlist_track_status is distinct from 'pending'
      or new.playlist_track_added_at is not null then
      raise exception 'Solo lo staff può cambiare l''esito della proposta'
        using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- Stesso brano: l'artista non può toccare stato o data di aggiunta.
  if new.playlist_track_status is distinct from old.playlist_track_status
    or new.playlist_track_added_at is distinct from old.playlist_track_added_at then
    raise exception 'Solo lo staff può cambiare l''esito della proposta'
      using errcode = 'P0001';
  end if;

  return new;
end;
$fn$;

drop trigger if exists artists_playlist_guard on public.artists;
create trigger artists_playlist_guard
  before update of playlist_track_status, playlist_track_url, playlist_track_added_at
  on public.artists
  for each row execute function public.guard_playlist_submission();

insert into supabase_migrations.schema_migrations (version, name) values
  ('0058', 'playlist_status_guard')
on conflict (version) do nothing;
