# Fase 1.3 — Blocco delle transizioni di ruolo

> Pianificazione (regola AGENTS.md #1).

## Regole richieste

| Da | A | Consentito |
|---|---|---|
| `fan` | `artist` / `venue` | ✅ una volta sola, poi irreversibile |
| `artist` | qualsiasi | ❌ per sempre |
| `venue` | qualsiasi | ❌ per sempre |
| chiunque | `admin` | ❌ (solo via `settings.admin_email`) |
| `admin` | qualsiasi | ✅ può correggere gli errori di scelta |

**Perché non serve un contatore:** l'unica transizione ammessa è `fan → artist|venue`. Dopo il cambio
l'utente non è più `fan`, quindi è bloccato dalla riga 2/3. Il "solo una volta" è una conseguenza,
non una cosa da tracciare (niente colonna, niente stato da mantenere).

## Interventi

### Database — `supabase/migrations/0004_role_lock.sql`

1. `prevent_role_escalation` riscritto con le regole sopra.
   - Le restrizioni valgono **solo per le modifiche fatte dall'utente via API** (`auth.uid() is not null`):
     SQL diretto dalla dashboard e `service_role` restano liberi → è l'eccezione admin richiesta.
   - Corregge anche un difetto latente di Fase 1: `handle_new_user` assegnava `role = 'admin'` al
     profilo dell'admin, ma il vecchio trigger **annullava** quell'aggiornamento (durante la
     registrazione `auth.uid()` è NULL). Ora funziona, e il profilo esistente viene allineato.
2. RLS — creare la propria riga richiede il ruolo coerente (non basta più essere loggati):
   - `artists`: serve `role = 'artist'`
   - `venues`: serve `role = 'venue'`
   - `events`: serve `role in ('artist','venue')`
   - l'`admin` è esentato in tutte e tre.
3. Registrazione di `0004` nello storico migration.

### Applicazione

| # | Intervento | File |
|---|---|---|
| 4 | Helper `getSessionProfile()` con `cache()` di React: legge utente + ruolo **una volta per richiesta** | `lib/supabase/session.ts` |
| 5 | `/onboarding/role`: se il ruolo non è `fan` mostra "ruolo già attivo" con il badge e il link alla propria area; il picker avvisa che la scelta è definitiva e **rilegge** il ruolo dopo il salvataggio (se non è cambiato, errore invece di finta riuscita) | `app/onboarding/role/page.tsx`, `components/auth/RolePicker.tsx` |
| 6 | Pagine protette: `/events/new` solo artista/locale/admin, `/onboarding/artist` solo artista/admin (un fan viene mandato alla scelta del ruolo) | `app/events/new/page.tsx`, `app/onboarding/artist/page.tsx` |
| 7 | Il ruolo si vede: badge in navbar + link contestuale (fan → "Diventa artista o locale", artista/locale → "Crea evento") | `components/layout/Navbar.tsx`, `app/layout.tsx` |
| 8 | Stringhe IT/EN | `i18n/dictionaries/it.ts`, `en.ts` |

## Verifiche previste

1. `fan → artist`: consentito; poi `artist → venue`, `artist → fan`, `artist → admin`: tutti annullati.
2. `venue → fan`: annullato.
3. Fan che crea una riga `artists` via API: **negato** dalla RLS; dopo il passaggio ad artista: consentito.
4. Fan che crea un evento: negato; artista: consentito.
5. Profilo admin allineato a `role = 'admin'`.
6. Advisor di sicurezza/performance invariati (nessuna regressione).
7. `npm run build` + deploy verde.
