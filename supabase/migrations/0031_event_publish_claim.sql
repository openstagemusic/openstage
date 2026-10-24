-- ============================================================================
-- OpenStage — correzione pubblicazione eventi reclamati
-- `events_require_review` guardava solo il profilo in `created_by`. Gli eventi
-- creati prima del claim hanno `created_by` nullo o di un altro profilo, quindi
-- un locale/artista verificato li riportava in bozza anche dopo “Pubblica”.
--
-- Ora la verifica vale anche per il proprietario della scheda collegata:
-- locale (`venue_id`) o artista (`artist_id`) con `profiles.verified_at`.
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

create or replace function public.events_require_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published')
     and not exists (
       select 1 from public.profiles p
       where p.id = new.created_by and p.verified_at is not null
     )
     and not exists (
       select 1
       from public.venues v
       join public.profiles p on p.id = v.profile_id
       where v.id = new.venue_id and p.verified_at is not null
     )
     and not exists (
       select 1
       from public.artists a
       join public.profiles p on p.id = a.profile_id
       where a.id = new.artist_id and p.verified_at is not null
     )
  then
    new.status := 'draft';
  end if;

  return new;
end;
$fn$;

drop trigger if exists events_require_review on public.events;

create trigger events_require_review
  before insert or update on public.events
  for each row execute function public.events_require_review();
