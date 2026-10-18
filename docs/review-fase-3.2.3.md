# Revisione Fase 3.2.3 — La richiesta in attesa si vede, blocca e si può ritirare

> Blocco di riparazione prima della 3.3 (dashboard/editor). Riguarda **B34** e la città del profilo,
> segnalati dall'utente il 18 ottobre 2026. Migration `0014_claim_pending.sql`.

## 1. Cosa ha chiesto l'utente

Due cose, in quest'ordine:

1. *"Metti a posto il fatto del reclamo in attesa"* (B34): una richiesta di reclamo di un locale in
   attesa non si vede da nessuna parte, non ferma nulla e non si può annullare.
2. *"In Supabase, quando si crea un nuovo profilo, la città non viene salvata in `profiles` ma solo in
   `artists`/`venues`; quando ho reclamato una scheda la città è diventata null."*

## 2. Diagnosi (verificata sul database, non dedotta)

### La richiesta in attesa: peggio di come la immaginava

Prova in transazione annullata, passo per passo:

| Passo | Esito reale |
| --- | --- |
| Il gestore chiede la scheda di "Locale Vero" | richiesta `pending` |
| Nel frattempo si crea la **sua** scheda | **riesce** (nessun blocco) |
| L'admin approva | la scheda appena creata è **eliminata in silenzio**, con città, indirizzo, pin e sito |

Se invece quella scheda ha **eventi**, l'approvazione fallisce (`free_vacant_page` → `occupata`) e
l'admin resta bloccato.

### La città: un campo morto

| Verifica | Esito |
| --- | --- |
| Il campo "Città (opzionale)" della registrazione finisce in `profiles.city`? | **sì** (utente di prova creato in transazione annullata: `city = "ProvaCittà"`) |
| Perché allora è vuota sui profili reali? | i due account esistenti sono nati con **Google** (`provider: google`): Google non manda nessuna città, e nessuno la chiede dopo |
| Qualcuno **legge** `profiles.city`? | **no**: mai mostrata, mai usata, nemmeno modificabile in `/account` |
| Qualcuno la **aggiorna**? | **no**: la scrive solo il trigger di creazione profilo, una volta sola |
| Il reclamo azzera una città? | **no**: `claim_artist` scrive solo `profile_id`. Provato: profilo "Casa Mia" + scheda "Veracittà" → dopo il reclamo entrambe invariate |
| Allora perché "la città è diventata null"? | perché la **propria** scheda (con la sua città) viene **eliminata** dal reclamo: "Pagina Mia / MiaCittà" → `ELIMINATA`. La città non è diventata null: era dentro la pagina buttata via |

In breve: la città della scheda (`artists.city`, `venues.city`) e quella del profilo (`profiles.city`)
sono due campi diversi; il secondo veniva **chiesto due volte** e **non faceva nulla**.

## 3. Decisioni

| Domanda | Decisione dell'utente |
| --- | --- |
| B34: blocco nel database + riquadro in `/account` + annullamento? | **Sì, tutto** |
| Che fare di `profiles.city`, inutile e invisibile? | **Togliere il campo dalla registrazione**: la città vive solo sulla scheda. La colonna resta inutilizzata (era già vuota ovunque, nessuna migrazione dei dati) |

Due decisioni prese da me, dentro il perimetro chiesto, perché il resto non reggeva senza:

- **Una richiesta in attesa alla volta** per profilo: senza questa regola il "blocco" avrebbe dovuto
  gestire più richieste contemporanee (elenco, quali blocca, cosa succede se ne approvano una).
- **La propria scheda non si elimina più all'invio**, solo all'approvazione: era la vera causa della
  città "diventata null", ed è un comportamento che punisce anche chi viene rifiutato.

## 4. Cosa è cambiato

**Database — `supabase/migrations/0014_claim_pending.sql`** (applicata: `claim_pending`)

- `claims.status` accetta `'withdrawn'` (vincolo `claims_status_check` rifatto).
- `withdraw_claim(p_claim_id)`: il richiedente ritira la **propria** richiesta **in attesa**;
  `revoke` da `public`/`anon`, `execute` a `authenticated`.
- `request_venue_claim`: una richiesta in attesa alla volta; il controllo sulla propria scheda con
  eventi diventa **di sola lettura** (niente più eliminazione all'invio).
- `block_page_with_pending_claim()` + trigger `artists_block_pending_claim`,
  `venues_block_pending_claim`: la creazione di una scheda con `profile_id` è **rifiutata dal
  database** finché quel profilo ha una richiesta `pending`, con un messaggio comprensibile.

**Applicazione**

| File | Cambiamento |
| --- | --- |
| `lib/claims/queries.ts` | Nuova `getMyPendingRequest()`: la richiesta in attesa di chi guarda, con la scheda. Rimossa `getMyPendingClaim()`, ora senza chiamanti |
| `app/actions/claims.ts` | Nuova `withdrawClaimAction` (chiama `withdraw_claim`) |
| `components/claims/PendingRequestPanel.tsx` | **Nuovo**: "Richiesta in valutazione", scheda richiesta, data, pulsante **Annulla richiesta**, esito |
| `app/account/page.tsx` | Il riquadro compare in cima; l'invito a creare una scheda resta nascosto finché la richiesta è in attesa |
| `app/onboarding/venue/page.tsx` | Con una richiesta in attesa: la ricerca resta, il modulo di creazione no; al suo posto il riquadro |
| `app/locali/[slug]/page.tsx` | Il pannello del reclamo non offre il pulsante se esiste una richiesta in attesa per **un'altra** scheda: spiega invece cosa fare |
| `components/claims/ClaimPanel.tsx` | Nuovo stato `pendingElsewhere` (con il pulsante verso il proprio account) |
| `components/auth/RegisterForm.tsx` | Il campo "Città" esce dalla registrazione (dallo stato, dal modulo e dai metadati inviati a Supabase) |
| `i18n/dictionaries/it.ts`, `en.ts` | Testi nuovi del riquadro e dello stato `pendingElsewhere`; `replaceVenue` chiarisce che la sostituzione avviene **all'approvazione**; rimossa la stringa `auth.city` |

## 5. Prove

**Sul database** — 20 controlli in transazione annullata, tutti ✅:

| Controllo | Esito |
| --- | --- |
| Richiesta di reclamo di un locale → `pending` | ✅ |
| Un altro utente prova a ritirare la richiesta | ✅ rifiutato (`42501 Questa richiesta non è tua`) |
| Creazione della propria scheda mentre è in attesa | ✅ rifiutata dal trigger, messaggio chiaro |
| Seconda richiesta mentre la prima è in attesa | ✅ rifiutata |
| Scheda con **eventi**: richiesta di un altro locale | ✅ rifiutata, scheda intatta |
| Ritiro della propria richiesta → `withdrawn` | ✅ |
| Dopo il ritiro la creazione è permessa | ✅ |
| La scheda vuota sopravvive all'attesa | ✅ (non più eliminata all'invio) |
| Approvazione → la scheda vecchia è eliminata, la reclamata è sua | ✅ |
| Ritirare una richiesta già decisa | ✅ rifiutato (`già stata decisa`) |
| Reclamo **artista** (immediato): scheda reclamata intatta, scheda vuota eliminata | ✅ (nessuna regressione) |

**Sulle pagine** — build di produzione locale (`next start -p 3100`) in Chrome headless
guidato da `puppeteer-core`, con una **sessione vera** (utente di prova creato e rimosso nella
stessa sessione). 19 controlli, tutti ✅, console senza errori:

| Caso | Atteso | Esito |
| --- | --- | --- |
| `/it/register` | campo "Città" assente, "Nome completo" presente | ✅ |
| Scheda di un altro locale, senza richieste | pulsante "Richiedi questa scheda" | ✅ |
| Richiesta inviata **dalla pagina** | "Richiesta inviata: in attesa di verifica." | ✅ |
| `/it/account` | riquadro, nome della scheda, data, pulsante di ritiro; invito a creare nascosto | ✅ |
| `/it/onboarding/venue` | riquadro al posto del modulo (nessun campo del modulo) | ✅ |
| Scheda di un **altro** locale con richiesta in attesa | spiegazione, **nessun** pulsante | ✅ |
| `POST /rest/v1/venues` con il **token vero** dell'utente | `400` con "Hai una richiesta in attesa" — il blocco non è solo nel modulo | ✅ |
| Ritiro dalla pagina dell'account | riquadro sparito, torna l'invito a creare la scheda | ✅ |
| `POST /rest/v1/venues` dopo il ritiro | `201`, scheda creata (poi rimossa) | ✅ |
| `/it/onboarding/venue` dopo il ritiro | modulo di creazione di nuovo presente | ✅ |

**Stato del database**: dopo i test, i dati reali sono intatti (2 profili, 3 artisti, 1 locale,
3 eventi, 0 bozze, 0 richieste in attesa) e **zero** residui di prova.

## 6. Cosa **non** è cambiato (e va detto)

- **La nota "inserito da OpenStage"** segue la regola della 3.2.2 (entrambe le schede libere).
- **Il rifiuto dell'admin** su una richiesta in attesa lascia la scheda di chi aveva chiesto
  esattamente com'era: da questa fase non perde più nulla.
- **Se durante l'attesa il richiedente crea eventi sulla propria scheda**, l'approvazione continua a
  fallire (`occupata`) e l'admin non può decidere: resta un caso da risolvere a mano (B31). Non l'ho
  bloccato di proposito: creare eventi è l'attività normale di un locale, e il blocco giusto è
  **staccare** una scheda (B31), non impedirgli di lavorare.
- **La conferma del ritiro** può essere sostituita subito dalla pagina aggiornata (il riquadro
  sparisce e torna l'invito a creare la scheda): sono due esiti entrambi corretti, ma quale dei due
  si veda dipende da quanto ci mette il rinnovo dei dati del server.
- **`profiles.city`** resta nel database, vuota e inutilizzata. Se un giorno servirà "la tua città"
  (per il "vicino a me"), si riempirà allora — e non più dalla registrazione.
- **La dashboard (3.3)** dovrà mostrare lo stesso riquadro: quando esisterà, basterà riusare
  `getMyPendingRequest()` e `PendingRequestPanel`.
- **Il manuale** (capitoli tecnico e di diario) è fermo alla 3.2: elenca ancora `events.is_unclaimed`
  e non parla di `claims`. Si aggiorna quando l'utente chiede di rigenerare il PDF.

## 7. Da fare a mano (una volta)

- **Riattivare la protezione CAPTCHA in Supabase** (Authentication → Attack Protection): è stata
  disattivata per il collaudo in locale, perché il login con password è bloccato senza CAPTCHA.
