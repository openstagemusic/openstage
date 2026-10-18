-- ============================================================================
-- OpenStage — Fase 3.3.2b (Geocodifica dell'editor)
-- Cache delle ricerche di luoghi: "Verona" non deve chiedere ogni volta al
-- servizio di geocodifica.
--
-- Perché una cache: la geocodifica passa da Photon (komoot), un servizio
-- pubblico e gratuito che chiede un uso ragionevole. Salvando le risposte già
-- ottenute, la stessa ricerca — anche fatta da persone diverse — costa una
-- chiamata sola. E se un domani si passa a un Photon self-hosted, questa
-- tabella continua a servire.
--
-- Le risposte sono dati pubblici di OpenStreetMap: la lettura è aperta a chi ha
-- una sessione. La scrittura no: passa soltanto dalla funzione `cache_geocode`,
-- che controlla chi chiama e la forma del dato. Una cache condivisa non deve
-- diventare un posto dove si scrive quello che si vuole.
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

create table if not exists public.geocode_cache (
  -- La ricerca normalizzata (minuscola, senza spazi ai bordi) è la chiave.
  query text primary key,
  results jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists geocode_cache_created_idx on public.geocode_cache (created_at desc);

comment on table public.geocode_cache is
  'Ricerche di luoghi già risolte (Photon/OpenStreetMap): evitano di ripetere la stessa chiamata.';
comment on column public.geocode_cache.results is
  'Elenco dei posti trovati: id, name, detail, city, latitude, longitude, zoom.';

alter table public.geocode_cache enable row level security;

-- Leggere le risposte già salvate è la strada normale per l'editor.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'geocode_cache'
      and policyname = 'geocode_cache_select_authenticated'
  ) then
    create policy geocode_cache_select_authenticated on public.geocode_cache
      for select to authenticated using (true);
  end if;
end $$;

-- Nessuna politica di scrittura: si scrive solo da qui sotto.
create or replace function public.cache_geocode(p_query text, p_results jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_query text := lower(btrim(coalesce(p_query, '')));
begin
  -- Senza una sessione non si scrive: la cache non è un archivio pubblico.
  if (select auth.uid()) is null then
    return;
  end if;

  if length(v_query) < 2 or length(v_query) > 120 then
    return;
  end if;

  -- Massimo otto posti per ricerca: oltre non è più una cache, è un deposito.
  if jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) > 8 then
    return;
  end if;

  insert into public.geocode_cache (query, results, created_at)
  values (v_query, p_results, now())
  on conflict (query) do update
    set results = excluded.results, created_at = now();
end;
$fn$;

comment on function public.cache_geocode(text, jsonb) is
  'Salva una ricerca di luoghi in cache. Chiamabile solo da chi ha una sessione.';

revoke all on function public.cache_geocode(text, jsonb) from public;
revoke all on function public.cache_geocode(text, jsonb) from anon;
grant execute on function public.cache_geocode(text, jsonb) to authenticated;
