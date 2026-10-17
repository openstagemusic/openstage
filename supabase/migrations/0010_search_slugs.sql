-- 0010 — Le funzioni di ricerca restituiscono anche l'indirizzo leggibile.
--
-- Le pagine pubbliche costruiscono l'indirizzo canonico dell'evento
-- (`/eventi/<citta>/<slug>`): per farlo servono `slug` ed `city` già nelle righe
-- che la ricerca restituisce. I suggerimenti diventano così collegamenti
-- diretti alle schede di artisti e locali, non più una ricerca per nome.
--
-- Cambiando le colonne di ritorno serve prima eliminare le funzioni: in
-- PostgreSQL `create or replace` non può cambiare il tipo di ritorno.

drop function if exists public.search_events(
  text, timestamptz, timestamptz, text, public.event_kind, boolean,
  double precision, double precision, double precision, boolean, integer, integer
);

drop function if exists public.search_suggestions(text, integer);

-- ---------------------------------------------------------------------------
-- Ricerca eventi (stessa logica della 0008 + `slug` e `slug` negli embed).
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
  is_unclaimed boolean,
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
    b.is_unclaimed,
    (
      select to_jsonb(t)
      from (select a.id, a.slug, a.name, a.city from public.artists a where a.id = b.artist_id) t
    ),
    (
      select to_jsonb(t)
      from (
        select v.id, v.slug, v.name, v.city, v.address, v.website
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

-- ---------------------------------------------------------------------------
-- Suggerimenti: `slug` e `city` servono a comporre l'indirizzo della scheda.
-- ---------------------------------------------------------------------------
create or replace function public.search_suggestions(
  p_query text,
  p_limit integer default 4
)
returns table (
  kind text,
  id uuid,
  label text,
  detail text,
  hits integer,
  slug text,
  city text
)
language plpgsql
stable
security invoker
set search_path = public, extensions
as $fn$
declare
  v_term text := trim(coalesce(p_query, ''));
  v_pattern text;
begin
  if length(v_term) < 2 then
    return;
  end if;

  v_pattern :=
    '%'
    || replace(replace(replace(v_term, '!', '!!'), '%', '!%'), '_', '!_')
    || '%';

  return query
  select
    'city'::text,
    null::uuid,
    e.city,
    null::text,
    count(*)::integer,
    null::text,
    e.city
  from public.events e
  where e.status = 'published'
    and e.starts_at >= now()
    and e.city is not null
    and e.city ilike v_pattern escape '!'
  group by e.city
  order by count(*) desc, e.city asc
  limit greatest(coalesce(p_limit, 4), 0);

  return query
  select
    'artist'::text,
    a.id,
    a.name,
    a.city,
    count(e.id)::integer,
    a.slug,
    a.city
  from public.artists a
  join public.events e
    on e.artist_id = a.id
   and e.status = 'published'
   and e.starts_at >= now()
  where a.name ilike v_pattern escape '!'
  group by a.id, a.name, a.city, a.slug
  order by similarity(a.name, v_term) desc, a.name asc
  limit greatest(coalesce(p_limit, 4), 0);

  return query
  select
    'venue'::text,
    v.id,
    v.name,
    v.city,
    count(e.id)::integer,
    v.slug,
    v.city
  from public.venues v
  join public.events e
    on e.venue_id = v.id
   and e.status = 'published'
   and e.starts_at >= now()
  where v.name ilike v_pattern escape '!'
  group by v.id, v.name, v.city, v.slug
  order by similarity(v.name, v_term) desc, v.name asc
  limit greatest(coalesce(p_limit, 4), 0);

  return query
  select
    'genre'::text,
    null::uuid,
    e.genre,
    null::text,
    count(*)::integer,
    null::text,
    null::text
  from public.events e
  where e.status = 'published'
    and e.starts_at >= now()
    and e.genre is not null
    and e.genre ilike v_pattern escape '!'
  group by e.genre
  order by count(*) desc, e.genre asc
  limit greatest(coalesce(p_limit, 4), 0);

  return query
  select
    'event'::text,
    e.id,
    e.title,
    coalesce(v.name, e.city),
    1::integer,
    e.slug,
    e.city
  from public.events e
  left join public.venues v on v.id = e.venue_id
  where e.status = 'published'
    and e.starts_at >= now()
    and e.title ilike v_pattern escape '!'
  order by e.starts_at asc
  limit greatest(coalesce(p_limit, 4), 0);
end;
$fn$;

grant execute on function public.search_events(
  text, timestamptz, timestamptz, text, public.event_kind, boolean,
  double precision, double precision, double precision, boolean, integer, integer
) to anon, authenticated;

grant execute on function public.search_suggestions(text, integer) to anon, authenticated;
