-- ============================================================================
-- OpenStage - Fase 14B (paese su eventi e locali)
-- L'Italia resta il default, ma una città estera non deve più dire "Italia".
-- Il codice è ISO 3166-1 alpha-2 (IT, GB, ES, FR…).
--
-- Idempotente.
-- ============================================================================

alter table public.events
  add column if not exists country text not null default 'IT';
alter table public.venues
  add column if not exists country text not null default 'IT';

alter table public.events drop constraint if exists events_country_check;
alter table public.events
  add constraint events_country_check check (country ~ '^[A-Z]{2}$');

alter table public.venues drop constraint if exists venues_country_check;
alter table public.venues
  add constraint venues_country_check check (country ~ '^[A-Z]{2}$');

-- Dato reale già presente: la città di Westminster è a Londra.
update public.events
   set country = 'GB'
 where country = 'IT' and (city_key like '%westminster%' or city ilike '%london%');
update public.venues
   set country = 'GB'
 where country = 'IT' and (city_key like '%westminster%' or city ilike '%london%');

create index if not exists events_country_city_idx
  on public.events (country, city_key);
create index if not exists venues_country_city_idx
  on public.venues (country, city_key);

comment on column public.events.country is 'Paese della serata (ISO 3166-1 alpha-2).';
comment on column public.venues.country is 'Paese del locale (ISO 3166-1 alpha-2).';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0075', 'country')
on conflict (version) do nothing;
