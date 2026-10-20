-- 0024 - La città ha una chiave, e il raggio dice la verità.
--
-- Due difetti che falsano i risultati senza dare nessun errore:
--
-- 1. La città è testo libero. "Milano", "milano" e "Milano (MI)" sono tre valori
--    distinti, quindi i menu dei filtri mostrano tre voci e ognuna trova un
--    pezzo di città. Qui nasce `city_key()`: minuscolo, senza accenti, senza la
--    provincia fra parentesi. Le colonne `city_key` sono **generate**: non
--    possono divergere dal testo, perché le calcola il database.
--
-- 2. Il filtro per distanza guarda solo il **centro** del pin. Una serata
--    dichiarata "zona di 3 km" il cui centro sta 300 metri fuori dal raggio
--    richiesto non compare, anche se la zona comprende chi cerca. Da qui in
--    avanti si misura la distanza dal **bordo** della zona: raggio dell'evento
--    sottratto alla distanza dal centro.

-- --- 1. La chiave della città -------------------------------------------------

create or replace function public.city_key(value text)
returns text
language sql
immutable
returns null on null input
as $$
  select nullif(
    btrim(
      regexp_replace(
        lower(
          translate(
            btrim(value),
            'àáâãäåèéêëìíîïòóôõöùúûüçñ’',
            'aaaaaaeeeeiiiiooooouuuucn'''
          )
        ),
        '\s*\([^)]*\)\s*$',
        ''
      )
    ),
    ''
  );
$$;

comment on function public.city_key(text) is
  'Chiave di confronto per le città: minuscolo, senza accenti, senza provincia fra parentesi.';

-- Le colonne generate non si possono scrivere dal client: sono sempre coerenti.
alter table public.events
  add column if not exists city_key text
  generated always as (public.city_key(city)) stored;

alter table public.artists
  add column if not exists city_key text
  generated always as (public.city_key(city)) stored;

alter table public.venues
  add column if not exists city_key text
  generated always as (public.city_key(city)) stored;

create index if not exists events_city_key_idx
  on public.events (city_key)
  where status = 'published';

create index if not exists artists_city_key_idx on public.artists (city_key);
create index if not exists venues_city_key_idx on public.venues (city_key);

-- --- 2. Il raggio guarda la zona, non solo il centro --------------------------

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
  price_text text,
  venue_name text,
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
          and (
            6371.0088 * 2 * asin(sqrt(
                  power(sin(radians(e.latitude - p_lat) / 2), 2)
                  + cos(radians(p_lat)) * cos(radians(e.latitude))
                    * power(sin(radians(e.longitude - p_lng) / 2), 2)
                ))
            -- Il bordo della zona, non il centro: una serata "±3 km" vale
            -- anche quando il suo centro cade appena fuori dal cerchio.
            - coalesce(e.area_radius_m, 0) / 1000.0
          ) <= p_radius_km
        )
      )
      and (
        v_pattern is null
        or e.title ilike v_pattern escape '!'
        or coalesce(e.city, '') ilike v_pattern escape '!'
        or coalesce(e.genre, '') ilike v_pattern escape '!'
        or coalesce(e.venue_name, '') ilike v_pattern escape '!'
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
    b.price_text,
    b.venue_name,
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

grant execute on function public.search_events(
  text, timestamptz, timestamptz, text, public.event_kind, boolean,
  double precision, double precision, double precision, boolean, integer, integer
) to anon, authenticated;
