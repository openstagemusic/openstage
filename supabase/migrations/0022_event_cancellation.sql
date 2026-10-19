-- 0022 — Un annullamento non è una sparizione.
--
-- Prima di questa migration un evento annullato **spariva da tutto**: la policy
-- `events_select_public` leggeva solo `status = 'published'`, quindi la serata
-- usciva dalla ricerca, dalla Home, dalla mappa, dai Preferiti e — cosa peggiore
-- — la sua pagina rispondeva **404**. Chi apriva un link condiviso in chat non
-- trovava nessuna spiegazione, e chi aveva salvato la serata non sapeva perché
-- non ci fosse più.
--
-- Da qui in avanti: l'annullato **non è più una destinazione** (ricerca, mappa e
-- Home leggono solo `published`, e nessuna di quelle funzioni cambia), ma
-- **resta leggibile** — pagina viva con etichetta, data e motivo. Fuori dal
-- sitemap e `noindex` (lo mette la pagina): chi ha il link lo trova, i motori di
-- ricerca smettono di pubblicizzare un concerto che non c'è.
--
-- Le bozze restano private come prima.

-- --- Quando e perché ---------------------------------------------------------

alter table public.events
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text;

comment on column public.events.cancelled_at is
  'Quando la serata è stata annullata. Si azzera se la serata torna in programma.';
comment on column public.events.cancel_reason is
  'Perché è stata annullata, se chi l''ha annullata l''ha scritto.';

alter table public.events drop constraint if exists events_cancel_reason_len;
alter table public.events
  add constraint events_cancel_reason_len
  check (cancel_reason is null or char_length(cancel_reason) <= 300);

-- Gli annullamenti già avvenuti non hanno una data: la stimiamo dall'ultima
-- modifica della riga. Meglio una data approssimativa che una data inventata.
update public.events
   set cancelled_at = coalesce(updated_at, now())
 where status = 'cancelled'
   and cancelled_at is null;

-- --- Chi può leggerli --------------------------------------------------------

drop policy if exists events_select_public on public.events;
create policy events_select_public on public.events
  for select using (
    status in ('published'::public.event_status, 'cancelled'::public.event_status)
    or created_by = (select auth.uid())
    or public.is_admin()
  );

-- --- La data la mette il database, non chi scrive ----------------------------

create or replace function public.events_cancellation_stamp()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'cancelled' then
      new.cancelled_at := now();
    else
      new.cancel_reason := null;
    end if;

    return new;
  end if;

  if new.status = 'cancelled' then
    -- Restando annullata la data non si sposta (e non si può falsificare
    -- scrivendola dal modulo); annullandola adesso si segna adesso.
    new.cancelled_at := coalesce(
      case when old.status = 'cancelled' then old.cancelled_at end,
      now()
    );
  else
    -- Rimessa in programma: la serata torna quella di prima, senza cicatrici.
    new.cancelled_at := null;
    new.cancel_reason := null;
  end if;

  return new;
end;
$$;

drop trigger if exists events_cancellation_stamp on public.events;
create trigger events_cancellation_stamp
  before insert or update on public.events
  for each row execute function public.events_cancellation_stamp();
