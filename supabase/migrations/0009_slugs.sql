-- 0009 — Indirizzi leggibili (slug), capienza dei locali e profili verificati.
--
-- Fase 3.1: le directory pubbliche e le schede hanno bisogno di indirizzi
-- leggibili e stabili (`/artisti/nome-artista`), e i locali hanno bisogno della
-- capienza per essere filtrati. Nessun dato finto: gli slug si generano dai
-- nomi reali già presenti.

-- ---------------------------------------------------------------------------
-- 1. Da nome a indirizzo
-- ---------------------------------------------------------------------------
-- `unaccent` non è installata (e non serve). Qui la normalizzazione è fatta per
-- gruppi di lettere: ogni gruppo è indipendente, quindi non può disallinearsi.
-- Maiuscole e minuscole sono elencate entrambe: non dipende dal "locale" del DB.
create or replace function public.slugify(value text)
returns text
language plpgsql
immutable
as $$
declare
  risultato text := lower(coalesce(value, ''));
  gruppo record;
begin
  for gruppo in
    select * from (values
      ('[àáâãäåāăąÀÁÂÃÄÅĀĂĄ]', 'a'),
      ('[èéêëēĕėęěÈÉÊËĒĔĖĘĚ]', 'e'),
      ('[ìíîïĩīĭįıÌÍÎÏĨĪĬĮ]', 'i'),
      ('[òóôõöøōŏőÒÓÔÕÖØŌŎŐ]', 'o'),
      ('[ùúûüũūŭůűųÙÚÛÜŨŪŬŮŰŲ]', 'u'),
      ('[ýÿÝŸ]', 'y'),
      ('[ñńÑŃ]', 'n'),
      ('[çćĉċčÇĆĈĊČ]', 'c'),
      ('[šśŝşŠŚŜŞ]', 's'),
      ('[žźżŽŹŻ]', 'z'),
      ('[ðÐ]', 'd'),
      ('[þÞ]', 't')
    ) as m(modello, sostituto)
  loop
    risultato := regexp_replace(risultato, gruppo.modello, gruppo.sostituto, 'g');
  end loop;

  -- Tutto ciò che non è lettera o cifra diventa un trattino singolo, senza
  -- trattini in testa o in coda.
  return trim(both '-' from regexp_replace(risultato, '[^a-z0-9]+', '-', 'g'));
end;
$$;

comment on function public.slugify(text) is
  'Trasforma un nome in un indirizzo: minuscole, accenti normalizzati, spazi in trattini.';

-- ---------------------------------------------------------------------------
-- 2. Generazione automatica e senza collisioni
-- ---------------------------------------------------------------------------
-- Vale per artisti, locali ed eventi: se lo slug non viene indicato, si ricava
-- dal nome (o dal titolo) e, se è già occupato, si aggiunge -2, -3…
create or replace function public.set_unique_slug()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidate text;
  suffix integer := 0;
  taken uuid;
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    return new;
  end if;

  if tg_table_name = 'events' then
    base := public.slugify(coalesce(new.title, ''));
  else
    base := public.slugify(coalesce(new.name, ''));
  end if;

  if base = '' then
    base := 'senza-nome';
  end if;

  candidate := base;

  loop
    execute format(
      'select id from public.%I where slug = $1 and id <> $2 limit 1',
      tg_table_name
    ) into taken using candidate, new.id;

    exit when taken is null;

    suffix := suffix + 1;
    candidate := base || '-' || suffix::text;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Colonne nuove
-- ---------------------------------------------------------------------------
alter table public.artists add column if not exists slug text;
alter table public.venues add column if not exists slug text;
alter table public.events add column if not exists slug text;

-- Capienza: la dichiara il gestore del locale. NULL significa "non dichiarata",
-- che è diverso da zero.
alter table public.venues add column if not exists capacity integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'venues_capacity_positive'
  ) then
    alter table public.venues
      add constraint venues_capacity_positive check (capacity is null or capacity > 0);
  end if;
end $$;

-- Verificato dall'admin dopo la revisione del primo evento: è un dato reale,
-- non un'etichetta commerciale.
alter table public.profiles add column if not exists verified_at timestamptz;

-- ---------------------------------------------------------------------------
-- 4. Riempimento degli indirizzi già esistenti
-- ---------------------------------------------------------------------------
-- Deterministico: a parità di nome, il primo per data prende l'indirizzo pulito.
with calcolati as (
  select
    id,
    coalesce(nullif(public.slugify(title), ''), 'evento') as base,
    row_number() over (
      partition by coalesce(nullif(public.slugify(title), ''), 'evento')
      order by starts_at, id
    ) as posizione
  from public.events
  where slug is null or btrim(slug) = ''
)
update public.events e
set slug = case when c.posizione = 1 then c.base else c.base || '-' || c.posizione::text end
from calcolati c
where e.id = c.id;

with calcolati as (
  select
    id,
    coalesce(nullif(public.slugify(name), ''), 'artista') as base,
    row_number() over (
      partition by coalesce(nullif(public.slugify(name), ''), 'artista')
      order by created_at, id
    ) as posizione
  from public.artists
  where slug is null or btrim(slug) = ''
)
update public.artists a
set slug = case when c.posizione = 1 then c.base else c.base || '-' || c.posizione::text end
from calcolati c
where a.id = c.id;

with calcolati as (
  select
    id,
    coalesce(nullif(public.slugify(name), ''), 'locale') as base,
    row_number() over (
      partition by coalesce(nullif(public.slugify(name), ''), 'locale')
      order by created_at, id
    ) as posizione
  from public.venues
  where slug is null or btrim(slug) = ''
)
update public.venues v
set slug = case when c.posizione = 1 then c.base else c.base || '-' || c.posizione::text end
from calcolati c
where v.id = c.id;

alter table public.artists alter column slug set not null;
alter table public.venues alter column slug set not null;
alter table public.events alter column slug set not null;

create unique index if not exists artists_slug_key on public.artists (slug);
create unique index if not exists venues_slug_key on public.venues (slug);
create unique index if not exists events_slug_key on public.events (slug);

-- ---------------------------------------------------------------------------
-- 5. Trigger: nessuna riga nuova senza indirizzo
-- ---------------------------------------------------------------------------
drop trigger if exists artists_set_slug on public.artists;
create trigger artists_set_slug
  before insert on public.artists
  for each row execute function public.set_unique_slug();

drop trigger if exists venues_set_slug on public.venues;
create trigger venues_set_slug
  before insert on public.venues
  for each row execute function public.set_unique_slug();

drop trigger if exists events_set_slug on public.events;
create trigger events_set_slug
  before insert on public.events
  for each row execute function public.set_unique_slug();

-- ---------------------------------------------------------------------------
-- 6. Indici per le directory
-- ---------------------------------------------------------------------------
-- Le directory filtrano per città; l'indirizzo è già indicizzato dall'unique.
create index if not exists artists_city_idx on public.artists (city);
create index if not exists venues_city_idx on public.venues (city);
