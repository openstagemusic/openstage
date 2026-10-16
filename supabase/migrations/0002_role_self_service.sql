-- ---------------------------------------------------------------------------
-- 0002 — Ruolo auto-dichiarabile (fix Google OAuth)
--
-- Il flusso OAuth non può trasportare metadati: gli utenti Google nascono con il
-- ruolo di default (`fan`) e devono poter dichiarare il loro ruolo dopo il primo
-- accesso. Lo stesso serve al fan che in futuro diventa artista.
--
-- Il ruolo `admin` resta assegnabile solo tramite `settings.admin_email`
-- (vedi `public.is_admin()`): nessun client può auto-promuoversi.
--
-- Idempotente: rieseguibile senza effetti collaterali.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Nessuno può diventare admin da solo: il tentativo viene annullato.
  if new.role = 'admin' and not public.is_admin() then
    new.role := old.role;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
