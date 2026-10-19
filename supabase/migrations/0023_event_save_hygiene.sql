-- 0023 — Igiene del salvataggio: niente doppioni, niente serate nel passato,
-- niente sovrascritture silenziose, e il campo «come arrivare».
--
-- Sono cinque cose piccole che però producono **dati falsi subito**: un
-- ritentativo di rete che crea due serate identiche, due schede aperte che si
-- sovrascrivono a vicenda, il link dei biglietti mai verificato, un centro
-- sociale senza indirizzo che la pagina non sa spiegare.

-- --- 1. La chiave del modulo: un invio ripetuto non crea una seconda serata ----
--
-- La chiave la genera il modulo e resta la stessa finché il modulo è aperto:
-- se la rete ripete l'invio, il database riconosce la riga e non la duplica.
-- Più righe con la chiave vuota sono normali (NULL non si confronta con NULL).

alter table public.events
  add column if not exists client_key text;

alter table public.events drop constraint if exists events_client_key_len;
alter table public.events
  add constraint events_client_key_len
  check (client_key is null or char_length(client_key) <= 64);

create unique index if not exists events_client_key_idx
  on public.events (created_by, client_key);

comment on column public.events.client_key is
  'Chiave del modulo di creazione: rende innocuo un invio ripetuto dallo stesso modulo.';

-- --- 2. «Come arrivare» ------------------------------------------------------
--
-- Per i posti che un indirizzo non ce l'hanno: centri sociali, loft, cortili,
-- spiagge. Un campo breve, che la pagina evento mostra accanto al dove.

alter table public.events
  add column if not exists directions_text text;

alter table public.events drop constraint if exists events_directions_len;
alter table public.events
  add constraint events_directions_len
  check (directions_text is null or char_length(directions_text) <= 400);

comment on column public.events.directions_text is
  'Come arrivare, per gli spazi che un indirizzo non ce l''hanno.';

-- --- 3. Il ritentativo non consuma quota -------------------------------------
--
-- Il tetto della `0020` conta le serate **create**: senza questa riga, un invio
-- ripetuto a quota esaurita riceverebbe "troppe serate" invece della serata già
-- creata — e l'idempotenza sarebbe una promessa a metà.

create or replace function public.events_rate_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_used integer;
  v_limit integer;
begin
  -- L'admin e il servizio (auth.uid() assente) non hanno quota.
  if new.created_by is null or auth.uid() is null or public.is_admin() then
    return new;
  end if;

  -- Invio ripetuto dallo stesso modulo: la riga c'è già, la lascia passare e
  -- sarà l'indice unico a fermarla.
  if new.client_key is not null
     and exists (
       select 1 from public.events e
        where e.created_by = new.created_by and e.client_key = new.client_key
     ) then
    return new;
  end if;

  select count(*) into v_used
    from public.event_creations c
   where c.profile_id = new.created_by
     and c.created_at > now() - interval '24 hours';

  v_limit := public.event_daily_limit(new.created_by);

  if v_used >= v_limit then
    raise exception 'Troppe serate nelle ultime 24 ore per questo account'
      using errcode = 'OS429',
            detail = format('create: %s, tetto: %s', v_used, v_limit);
  end if;

  return new;
end;
$$;
