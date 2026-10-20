-- 0026 - Segnalazioni e moderazione dopo la pubblicazione (B40).
--
-- Fino a ieri l'admin aveva i permessi ma non l'interfaccia: un account
-- verificato che pubblicava serate false non passava da nessuna coda.
--
-- Qui nasce il minimo che serve, senza processi automatici opachi:
--
--   * `reports`: chiunque abbia una sessione può segnalare una serata, una volta
--     sola (la chiave è `event_id + reporter_id`). Nessuna recensione, nessun
--     voto: solo una segnalazione che l'admin legge.
--   * **Auto-nascondimento morbido**: alla terza segnalazione da **utenti
--     diversi e verificati** la serata torna in bozza (`status = 'draft'`), con
--     `auto_hidden_at` e lo stato di prima in `auto_hidden_status`. Non è una
--     condanna: è una pausa, e l'admin può rimetterla online con un clic.
--   * Nessuna penalità per chi pubblica tanto: la visibilità ridotta si applica
--     **solo** alle serate finite in moderazione, mai a un account intero.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('fake', 'wrong_info', 'spam', 'offensive', 'other')),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  constraint reports_one_per_person unique (event_id, reporter_id)
);

create index if not exists reports_event_idx on public.reports (event_id, created_at desc);
create index if not exists reports_status_idx on public.reports (status);

comment on table public.reports is
  'Segnalazioni delle serate: una per persona per evento, lette solo dall''admin.';

alter table public.reports enable row level security;

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists reports_select_own_or_admin on public.reports;
create policy reports_select_own_or_admin on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- Auto-nascondimento -------------------------------------------------------

alter table public.events
  add column if not exists auto_hidden_at timestamptz;

alter table public.events
  add column if not exists auto_hidden_status public.event_status;

comment on column public.events.auto_hidden_at is
  'Quando la serata è stata messa in pausa dalle segnalazioni (null = mai).';
comment on column public.events.auto_hidden_status is
  'Lo stato che la serata aveva prima della pausa: serve a rimetterla online.';

create or replace function public.reports_apply_threshold()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_reporters integer;
begin
  select count(distinct r.reporter_id)
    into v_reporters
    from public.reports r
    join public.profiles p on p.id = r.reporter_id
   where r.event_id = new.event_id
     and r.status = 'open'
     and p.verified_at is not null;

  if v_reporters >= 3 then
    update public.events
       set auto_hidden_at = now(),
           auto_hidden_status = status,
           status = 'draft'
     where id = new.event_id
       and status = 'published'
       and auto_hidden_at is null;
  end if;

  return new;
end;
$fn$;

drop trigger if exists reports_apply_threshold on public.reports;
create trigger reports_apply_threshold
  after insert on public.reports
  for each row execute function public.reports_apply_threshold();
