-- 0025 - Due schede, una sola serata: l'unione (B39).
--
-- Il caso vero: una serata inserita dal **locale** ha `artist_id` nullo, quindi
-- non compare sulla pagina dell'artista; l'artista la reinserisce e nascono due
-- righe per lo stesso concerto. Non si può indovinare quale sia quella giusta
-- automaticamente, quindi:
--
--   * il modulo del locale può **collegare** una scheda artista esistente;
--   * chi inserisce viene **avvisato** se una serata simile esiste già (mai
--     bloccato: due set nello stesso locale la stessa sera sono legittimi);
--   * l'unione è un gesto **dell'admin**, reversibile.
--
-- Un evento unito non è un evento annullato, ma per il pubblico deve sparire:
-- si mette `status = 'cancelled'` (tutti gli elenchi già escludono gli annullati)
-- e si conserva lo stato di prima in `merged_status`, così l'operazione si può
-- disfare senza indovinare.

alter table public.events
  add column if not exists merged_into uuid references public.events(id) on delete set null;

alter table public.events
  add column if not exists merged_at timestamptz;

alter table public.events
  add column if not exists merged_status public.event_status;

alter table public.events drop constraint if exists events_merged_into_self;
alter table public.events
  add constraint events_merged_into_self
  check (merged_into is null or merged_into <> id);

create index if not exists events_merged_into_idx
  on public.events (merged_into)
  where merged_into is not null;

comment on column public.events.merged_into is
  'Se valorizzata, questa scheda è un doppione unito a quella indicata: la pagina rimanda lì.';
comment on column public.events.merged_status is
  'Lo stato che la scheda aveva prima dell''unione: serve a disfarla.';

-- --- Unione e separazione, solo per l'admin -----------------------------------

create or replace function public.merge_event(p_source uuid, p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not exists (
    select 1 where public.is_admin()
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_source = p_target then
    raise exception 'same event' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.events e where e.id = p_target and e.merged_into is null
  ) then
    raise exception 'target missing or already merged' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.events e where e.id = p_source) then
    raise exception 'source missing' using errcode = 'P0002';
  end if;

  -- I Preferiti non si perdono: si spostano sulla scheda che resta. Chi aveva
  -- già salvato entrambe resta con un solo preferito (la chiave è la coppia).
  update public.saved_events s
     set event_id = p_target
   where s.event_id = p_source
     and not exists (
       select 1 from public.saved_events t
        where t.profile_id = s.profile_id and t.event_id = p_target
     );

  delete from public.saved_events where event_id = p_source;

  update public.events
     set merged_into = p_target,
         merged_at = now(),
         merged_status = status,
         status = 'cancelled',
         cancel_reason = null
   where id = p_source;
end;
$fn$;

create or replace function public.unmerge_event(p_event uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not exists (
    select 1 where public.is_admin()
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.events
     set status = coalesce(merged_status, 'draft'),
         merged_into = null,
         merged_at = null,
         merged_status = null
   where id = p_event and merged_into is not null;
end;
$fn$;

revoke all on function public.merge_event(uuid, uuid) from public;
revoke all on function public.unmerge_event(uuid) from public;
grant execute on function public.merge_event(uuid, uuid) to authenticated;
grant execute on function public.unmerge_event(uuid) to authenticated;
