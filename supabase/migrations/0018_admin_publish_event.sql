-- ============================================================================
-- OpenStage — Fase 3.3.2c (Pubblicare il primo evento verifica il profilo)
-- L'admin pubblica una bozza dalla coda e, nello stesso gesto, il profilo che
-- l'ha scritta diventa verificato.
--
-- Perché: la decisione 5 del piano (docs/plan-fase-3.md) dice "primo evento in
-- revisione, poi pubblicazione automatica". Finora la pubblicazione dell'evento
-- e la verifica del profilo erano due gesti separati, e chi nasce creando la
-- *propria* scheda (primo passo dell'onboarding) non compare nella coda dei
-- reclami: restava "in attesa di verifica" per sempre, e ogni suo evento nuovo
-- ricadeva in bozza.
--
-- La regola sta nel database, non nella rotta: la funzione rifà da capo i
-- controlli, quindi vale per qualunque strada la chiami.
--
-- Schede senza padrone (`events.created_by` vuoto): non verificano nessuno.
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Pubblicare (solo admin) e verificare chi ha scritto l'evento
--
-- `coalesce` conserva la prima verifica: rieseguirla non rinnova la data.
-- ---------------------------------------------------------------------------
create or replace function public.admin_publish_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_autore uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può pubblicare un evento' using errcode = '42501';
  end if;

  update public.events
     set status = 'published'
   where id = p_event_id
   returning created_by into v_autore;

  if not found then
    raise exception 'Evento inesistente' using errcode = 'P0002';
  end if;

  if v_autore is not null then
    update public.profiles
       set verified_at = coalesce(verified_at, now())
     where id = v_autore;
  end if;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Permessi: come le altre funzioni di moderazione, solo a chi ha una sessione.
-- `is_admin()` all'interno ferma comunque chiunque altro.
-- ---------------------------------------------------------------------------
revoke all on function public.admin_publish_event(uuid) from public, anon;
grant execute on function public.admin_publish_event(uuid) to authenticated;
