-- 0013 — "Non reclamato" è un fatto delle schede, non un campo salvato.
--
-- `events.is_unclaimed` era un residuo della Fase 1: si scriveva all'inserimento
-- dell'evento e **nessuno lo aggiornava più** (nessun trigger lo tocca, nessuna
-- azione dell'app lo scrive). Chi reclamava la scheda non cambiava niente:
-- l'evento di Bobo Rondelli restava "non reclamato" anche dopo il reclamo.
--
-- Da qui in avanti la verità è una sola: `artists.profile_id` e
-- `venues.profile_id`, la stessa che decide il badge "Non reclamato" delle
-- directory. Un evento è "non reclamato" quando **almeno una** delle schede
-- collegate esiste e **nessuna** è stata reclamata; un evento senza artista né
-- locale non ha nessuna scheda da reclamare, quindi non porta la nota.
--
-- Il calcolo vive dove le righe diventano eventi pubblici (`toPublicEvent`), che
-- è lo stesso punto per elenco, mappa, home e pagina evento. Perché anche la
-- ricerca (`search_events`) possa farlo, la funzione deve restituire i due
-- `profile_id`: e siccome `create or replace` non può cambiare le colonne di
-- ritorno, la funzione si elimina e si ricrea.

drop function if exists public.search_events(
  text, timestamptz, timestamptz, text, public.event_kind, boolean,
  double precision, double precision, double precision, boolean, integer, integer
);

alter table public.events drop column if exists is_unclaimed;

-- ---------------------------------------------------------------------------
-- Ricerca eventi (stessa logica della 0010: senza `is_unclaimed`, con i
-- `profile_id` di artista e locale dentro i due embed).
-- ---------------------------------------------------------------------------
create or replace function public.search_events(
  p_query text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_genre text default null,
  p_kind public.event_kind default null,
  p_free_only boolean default false,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_only_located boolean default false,
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  starts_at timestamptz,
  timezone text,
  city text,
  latitude double precision,
  longitude double precision,
  location_precision public.location_precision,
  area_radius_m integer,
  genre text,
  kind public.event_kind,
  is_free boolean,
  ticket_url text,
  cover_image_url text,
  is_featured boolean,
  artists jsonb,
  venues jsonb,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = public, extensions
as $fn$
declare
  v_pattern text;
begin
  if coalesce(trim(p_query), '') <> '' then
    v_pattern :=
      '%'
      || replace(replace(replace(trim(p_query), '!', '!!'), '%', '!%'), '_', '!_')
      || '%';
  end if;

  return query
  with base as (
    select e.*
    from public.events e
    where e.status = 'published'
      and (p_from is null or e.starts_at >= p_from)
      and (p_to is null or e.starts_at <= p_to)
      and (p_genre is null or e.genre = p_genre)
      and (p_kind is null or e.kind = p_kind)
      and (p_free_only is not true or e.is_free)
      and (p_only_located is not true or (e.latitude is not null and e.longitude is not null))
      and (
        p_radius_km is null
        or p_lat is null
        or p_lng is null
        or (
          e.latitude is not null
          and e.longitude is not null
          -- Distanza in km sulla sfera (formula dell'emisenoverso).
          and 6371.0088 * 2 * asin(sqrt(
                power(sin(radians(e.latitude - p_lat) / 2), 2)
                + cos(radians(p_lat)) * cos(radians(e.latitude))
                  * power(sin(radians(e.longitude - p_lng) / 2), 2)
              )) <= p_radius_km
        )
      )
      and (
        v_pattern is null
        or e.title ilike v_pattern escape '!'
        or coalesce(e.city, '') ilike v_pattern escape '!'
        or coalesce(e.genre, '') ilike v_pattern escape '!'
        or exists (
          select 1 from public.artists a
          where a.id = e.artist_id and a.name ilike v_pattern escape '!'
        )
        or exists (
          select 1 from public.venues v
          where v.id = e.venue_id and v.name ilike v_pattern escape '!'
        )
      )
  )
  select
    b.id,
    b.slug,
    b.title,
    b.description,
    b.starts_at,
    b.timezone,
    b.city,
    b.latitude,
    b.longitude,
    b.location_precision,
    b.area_radius_m,
    b.genre,
    b.kind,
    b.is_free,
    b.ticket_url,
    b.cover_image_url,
    b.is_featured,
    (
      select to_jsonb(t)
      from (
        select a.id, a.slug, a.name, a.city, a.profile_id
        from public.artists a where a.id = b.artist_id
      ) t
    ),
    (
      select to_jsonb(t)
      from (
        select v.id, v.slug, v.name, v.city, v.address, v.website, v.profile_id
        from public.venues v where v.id = b.venue_id
      ) t
    ),
    count(*) over ()
  from base b
  order by b.starts_at asc, b.id asc
  limit greatest(coalesce(p_limit, 12), 0)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$fn$;
