# Piano blocco 3.2 — Reclamo delle schede, verifica e coda di moderazione

> Scritto prima di toccare il codice. Blocco 3.1 fatto e verificato in produzione.
> Questo documento è il contratto: se qualcosa va cambiato, si cambia qui e si dice perché.

## Cosa costruisce questo blocco

Oggi ogni scheda di artista o locale **è di OpenStage**: nasce dagli eventi reali e nessuno l'ha
reclamata. 3.2 costruisce il passaggio di consegne — l'artista e il locale prendono in mano la
propria scheda — e insieme la fiducia che lo rende sicuro: la verifica, la coda di moderazione, e
il fatto che chi non è ancora verificato non possa pubblicare a nome di altri.

## Fatti verificati nel database e nel codice (non stime)

| Fatto | Conseguenza per il progetto |
| --- | --- |
| `artists`/`venues`: lettura pubblica, scrittura "proprio o admin" | Un utente **non può** auto-assegnarsi una scheda esistente: `profile_id` è vuoto e la condizione `auth.uid() = profile_id` è falsa. Il reclamo **deve** passare da una funzione controllata, non dalla RLS diretta |
| `venues_insert_own` esiste già | "Aggiungi il tuo locale" è **solo interfaccia mancante**: la regola è già giusta |
| `is_admin()` legge `public.settings.admin_email` (tabella leggibile solo dall'admin) | La coda di moderazione funziona con la **sessione dell'admin**: nessuna chiave di servizio, nessuna variabile nuova |
| `prevent_role_escalation` (trigger) blocca ogni cambio di ruolo tranne `fan → artista/locale`, una volta sola e senza ritorno | Le regole di ruolo sono già nel database: 3.2 non deve riscriverle |
| `profiles.verified_at` esiste ed è vuoto per tutti | La verifica è un concetto nuovo, da riempire di senso (vedi sotto) |
| `events_insert_authenticated` lascia inserire eventi **già pubblicati** a un profilo artista/locale | Oggi chi reclama una scheda potrebbe pubblicare eventi a nome di un artista reale via API. Va chiuso |
| `lib/auth.ts` (`isAdminEmail`) **non è importato da nessuna parte** | Il controllo admin nell'app è codice morto e contraddice il database. Si allinea al database |
| Nessuna tabella `claims`, nessun bucket Storage | 3.2 introduce la tabella; le immagini restano in 3.3 |
| 2 profili: 1 admin, 1 fan | C'è già un secondo account per provare `fan → artista/locale` |

## La decisione centrale: che cosa significa "verificato"

`profiles.verified_at` diventa la chiave di tutto, con una regola sola:

> **Chi non è verificato può lavorare, ma non pubblicare.**

- Il reclamo di un **artista** resta **immediato** (come deciso nel piano di fase): la scheda si
  collega subito al profilo, con **link di prova obbligatorio**, e resta "in attesa di verifica".
  L'artista vero non aspetta un moderatore per esistere sulla piattaforma.
- Il reclamo di un **locale** resta **richiesta + approvazione** (come deciso): la scheda del locale
  è quella che ospita gli eventi, e lì l'errore costa di più.
- **Regola nel database** (nuova, in 3.2): finché un profilo non è verificato, gli eventi che crea
  nascono **in bozza**, e li pubblica l'admin dalla coda. L'admin non è toccato dalla regola.
- Quando l'admin verifica un profilo dalla coda, da quel momento in poi pubblica da solo. La
  verifica non è un badge decorativo: **è il permesso di pubblicare**.

Senza questa regola il reclamo immediato sarebbe un buco: chiunque potrebbe prendere il nome di un
artista reale e pubblicare eventi falsi. Con questa regola, il peggio che succede è una scheda
reclamata con dati sbagliati, che l'admin revoca con un clic.

## Migration `0011_claims.sql`

**Tabella `claims`** — la richiesta di reclamo, una riga per richiesta:
`id`, `subject_type` (`artist`/`venue`), `artist_id` / `venue_id` (con vincolo: esattamente uno dei
due, coerente col tipo), `profile_id` (chi chiede), `status` (`pending`/`approved`/`rejected`/`revoked`),
`proof_url` (obbligatorio, non vuoto), `note`, `created_at`, `decided_at`, `decided_by`.

**RLS su `claims`**: inserimento solo per sé stessi; lettura per sé stessi o per l'admin; modifica e
cancellazione solo admin. Nessuna scrittura diretta degli stati: le transizioni passano dalle funzioni.

**Funzioni** (tutte `SECURITY DEFINER` con `search_path` fissato e controllo esplicito di `auth.uid()`):

| Funzione | Chi | Cosa fa |
| --- | --- | --- |
| `claim_artist(artist, prova)` | utente con ruolo artista | Collega subito la scheda, scrive la richiesta come approvata "in attesa di verifica". Rifiuta se già reclamata |
| `request_venue_claim(venue, prova)` | utente con ruolo locale | Mette la richiesta in coda |
| `decide_claim(claim, approva)` | solo admin | Approva (collega la scheda, e verifica il profilo) o rifiuta; quando approva, chiude le altre richieste aperte sullo stesso soggetto |
| `revoke_claim(claim)` | solo admin | Scollega la scheda e la riporta a "non reclamata" |
| `set_profile_verified(profilo, verificato)` | solo admin | Il permesso di pubblicare, dato e tolto |

**Trigger `events_require_review`**: su inserimento, se l'autore non è verificato e non è admin,
`status := 'draft'`. Non tocca gli eventi dell'admin né le modifiche (l'editor arriva in 3.3).

**Pulizia segnalata dal linter**: `search_path` fissato su `slugify` e `set_unique_slug` (due
segnalazioni già presenti, si chiudono approfittando della migration).

## Interfaccia

- **Schede** `/artisti/[slug]` e `/locali/[slug]`: quando la scheda non è reclamata compare
  "Reclama questa scheda" con l'avviso su cosa comporta e il campo del link di prova. Se è reclamata
  ma non verificata, una striscia dice "in attesa di verifica".
- **`/admin`** (noindex, accessibile solo all'admin): tre elenchi — reclami da decidere, richieste di
  locali, eventi in bozza da pubblicare — più la verifica dei profili.
- **`/account`**: modifica dei propri dati (bio e link per l'artista; indirizzo, capienza, sito per il
  locale) e stato della propria scheda (reclamata / verificata / eventi in revisione).
- **`/onboarding/venue`**: "Aggiungi il tuo locale", gemello di quello per gli artisti che esiste già.
- Dizionari `it` + `en` insieme.

## Prove previste

1. **SQL con identità simulata**: `set local role authenticated` + `request.jwt.claims` per provare le
   funzioni e la RLS come farebbe un utente vero, **compresi i casi negativi**: fan che tenta di
   reclamare, secondo utente su scheda già presa, non-admin che tenta di approvare, evento creato da
   profilo non verificato, doppia richiesta sullo stesso locale.
2. **Browser**: schede pubbliche con e senza pulsante di reclamo; anonimo che prova ad aprire `/admin`;
   `noindex` sulle pagine private.
3. **Giro completo** (reclamo → coda → approvazione → pubblicazione senza revisione): da decidere con
   l'utente, vedi domanda in chat.
4. `npm run build` + prova in produzione, come per 3.1.

## Fuori perimetro (resta nei blocchi successivi)

- Caricamento immagini e locandine (3.3, serve un bucket Storage).
- Editor eventi completo e bozze con interfaccia (3.3): in 3.2 una bozza si vede solo in coda.
- Email di notifica a chi chiede il reclamo (Fase 6).
- Rifinitura estetica (fase finale).
