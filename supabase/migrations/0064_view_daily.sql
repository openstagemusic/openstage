-- ============================================================================
-- OpenStage - Fase 11B.2 (analytics aggregate)
-- Visualizzazioni per giorno e per scheda, senza dati personali:
-- niente IP, niente cookie, niente user agent, nessun identificativo utente.
-- Solo un contatore: (giorno, tipo, scheda) -> quante volte è stata aperta.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.view_daily (
  day date not null,
  kind text not null check (kind in ('event', 'artist', 'venue', 'epk')),
  target_id uuid not null,
  views integer not null default 0 check (views >= 0),
  primary key (day, kind, target_id)
);

create index if not exists view_daily_target_idx
  on public.view_daily (kind, target_id, day desc);

alter table public.view_daily enable row level security;

-- Lettura: solo il proprietario della scheda (e lo staff). Nessun aggregato
-- pubblico: i numeri servono a chi pubblica, non a fare classifiche.
drop policy if exists view_daily_owner_read on public.view_daily;
create policy view_daily_owner_read on public.view_daily
  for select to authenticated
  using (
    public.is_admin()
    or (
      kind in ('artist', 'epk')
      and exists (
        select 1 from public.artists a
        where a.id = view_daily.target_id and a.profile_id = auth.uid()
      )
    )
    or (
      kind = 'venue'
      and exists (
        select 1 from public.venues v
        where v.id = view_daily.target_id and v.profile_id = auth.uid()
      )
    )
    or (
      kind = 'event'
      and exists (
        select 1 from public.events e
        where e.id = view_daily.target_id and e.created_by = auth.uid()
      )
    )
  );

-- Scrittura: nessuna policy. Si passa solo da qui, con +1 sul giorno UTC.
-- Il proprietario della scheda non incrementa i propri numeri.
create or replace function public.record_view(p_kind text, p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('event', 'artist', 'venue', 'epk') then
    return;
  end if;

  if p_kind in ('artist', 'epk') and exists (
    select 1 from public.artists a where a.id = p_target and a.profile_id = auth.uid()
  ) then
    return;
  end if;

  if p_kind = 'venue' and exists (
    select 1 from public.venues v where v.id = p_target and v.profile_id = auth.uid()
  ) then
    return;
  end if;

  if p_kind = 'event' and exists (
    select 1 from public.events e where e.id = p_target and e.created_by = auth.uid()
  ) then
    return;
  end if;

  insert into public.view_daily (day, kind, target_id, views)
  values ((now() at time zone 'utc')::date, p_kind, p_target, 1)
  on conflict (day, kind, target_id)
  do update set views = public.view_daily.views + 1;
end;
$$;

revoke all on function public.record_view(text, uuid) from public;
grant execute on function public.record_view(text, uuid) to anon, authenticated;

comment on table public.view_daily is
  'Visualizzazioni aggregate per giorno e scheda. Nessun dato personale.';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0064', 'view_daily')
on conflict (version) do nothing;
