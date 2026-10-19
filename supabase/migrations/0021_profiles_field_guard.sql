-- 0021 — Il profilo non si verifica da solo.
--
-- Buco trovato il 19 ottobre preparando i test della 3.3.4.
--
-- `profiles_update_own_or_admin` lascia al proprietario l'aggiornamento della
-- propria riga (serve ad aggiornare nome e ruolo nell'iscrizione), ma il trigger
-- `profiles_guard` proteggeva **solo il ruolo**. Conseguenza: chiunque poteva
-- scrivere `verified_at` sulla propria riga e **verificarsi da solo**, cioè
-- pubblicare senza revisione — la regola "primo evento in revisione" non
-- esisteva più. Con la 3.3.4 lo stesso buco avrebbe permesso di togliersi la
-- sospensione e di alzarsi il tetto anti-spam a piacere. Falsificabile allo
-- stesso modo era anche l'**email** del profilo, quella che l'admin legge nella
-- coda delle richieste: bastava copiare quella di un altro per passare un
-- controllo a mano.
--
-- Da qui in avanti, per chi non è admin, quei campi si **ignorano**: la stessa
-- forma già usata per il ruolo — nessun errore da leggere, nessun dato che
-- cambia. L'admin (e il servizio: migrazioni, manutenzione) resta l'unico che
-- può cambiarli.

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- auth.uid() assente = operazione di servizio: passa.
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       and (old.role <> 'fan' or new.role not in ('artist', 'venue')) then
      new.role := old.role;
    end if;

    new.verified_at := old.verified_at;
    new.suspended_at := old.suspended_at;
    new.events_daily_limit := old.events_daily_limit;
    new.email := old.email;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.prevent_role_escalation() is
  'Campi che un profilo non può cambiare da solo: ruolo (se non fan → artista/locale), verificato, sospensione, tetto anti-spam, email.';
