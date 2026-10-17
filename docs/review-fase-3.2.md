# Review — Fase 3.2: reclamo delle schede, verifica, coda di moderazione

> Fatto il 17 ottobre 2026. Build verde (`npm run build`), prove sul database con identità
> simulate, prova in browser del giro completo su build di produzione (`next start`, porta 3100).
> **47 prove sulle regole del database · 4 prove sulle policy di lettura · 8 interrogazioni su
> PostgREST reale · 67 controlli in browser (31 registrazione/reclamo + 36 coda e pagine
> pubbliche), 0 falliti, zero errori in console.**

## Cosa fa questo blocco

1. **La tabella `claims`** (migration `0011_claims.sql`): la richiesta di una scheda. Riga con
   soggetto (artista **o** locale, mai entrambi), chi la chiede, la prova (un link pubblico
   obbligatorio), lo stato e chi ha deciso. Si scrive **solo** tramite funzioni: la tabella ha la
   sola policy di lettura (la propria richiesta, o tutte se admin).
2. **Reclamo immediato dell'artista** (`claim_artist`): l'artista vero non aspetta un moderatore.
   Un link di prova obbligatorio, la scheda passa subito sotto il suo profilo, e la richiesta nasce
   già chiusa (`approved`, senza `decided_by`: nessun moderatore è intervenuto).
3. **Richiesta per un locale** (`request_venue_claim`): resta `pending` finché un admin non decide.
   La scheda di un locale ospita gli eventi di tutti, lì un errore costa di più.
4. **La decisione dell'admin** (`decide_claim`, `revoke_claim`): primo che ottiene l'approvazione
   vince, le altre richieste aperte sullo stesso soggetto si chiudono da sole. Approvare equivale a
   **verificare**: l'admin ha appena controllato la prova. La revoca stacca la scheda e **non**
   toglie la verifica (la persona resta sé stessa, perde la scheda).
5. **"Chi non è verificato può lavorare, ma non pubblicare"** — la decisione presa con te prima di
   costruire. Il trigger `events_require_review` guarda solo il *passaggio* a pubblicato: un evento
   inserito o portato a `published` da un profilo senza verifica nasce (o resta) in **bozza**.
   Modificare un evento già pubblicato non lo caccia dal sito, e le scritture dell'admin e quelle
   senza utente (migrazioni, servizio) non sono toccate.
6. **Il badge "Verificato"** (`verified_profile_ids()`): la verifica è un fatto **pubblico** — la
   scheda verificata lo dice a tutti — ma `profiles` contiene l'email ed è leggibile solo da sé
   stessi o dall'admin. La funzione espone **solo gli identificativi** dei profili verificati: il
   minimo indispensabile, senza allargare la lettura di una tabella che contiene dati personali.
7. **La coda di moderazione `/admin`**: quattro sezioni — richieste per i locali, schede da
   verificare, eventi in bozza, profili verificati. Chi non è l'admin riceve un **404**, non un
   "accesso negato": la pagina non rivela nemmeno di esistere. Il permesso lo decide `is_admin()`
   nel database, la stessa funzione che poi autorizza ogni singola azione.
8. **Il pannello di reclamo** sulle schede pubbliche: cinque stati — *non reclamata* (invito, o
   accesso per chi non è dentro), *in attesa* (solo per il locale), *reclamata da altri*, *tua*
   (nessuna scritta: lo stato sta nell'account), *amministri già una scheda* (vedi sotto). Il mondo
   esterno vede "Non reclamato" o "Verificato"; l'attesa di verifica la vedono solo il proprietario
   e l'admin.
9. **La pagina `/account`** con lo stato della propria scheda (verificata / in attesa, e cosa
   comporta) e la modifica dei propri dati.
10. **`/onboarding/venue`**: la porta d'ingresso per un locale, che prima non esisteva. Le
    registrazioni con ruolo "Locale" finivano sulla home: ora finiscono qui, come gli artisti.

## Le trappole vere trovate (e risolte)

**1. Il reclamo non poteva passare dalla RLS.** Su `artists` e `venues` la policy di modifica
consente solo `profile_id = auth.uid()` — giusto, è la regola che protegge le schede. Ma una scheda
**non reclamata ha `profile_id` vuoto**: il confronto è falso, e l'UPDATE viene respinto dal
database. Non era un dettaglio da sistemare nella policy: è la prova che il reclamo **non è una
scrittura come le altre** e che tutte le transizioni dovevano passare da funzioni controllate
(`SECURITY DEFINER`, `search_path` fisso, `execute` tolto ad anon). Se l'avessi scritto come un
semplice UPDATE lato client, avrebbe funzionato in prova e sarebbe stato aperto a chiunque.

**2. L'ambiguità dei collegamenti in `claims`.** `profiles` compare **due volte** nella tabella
(chi chiede la scheda e chi decide). Una richiesta PostgREST con l'incorporamento "semplice" non sa
quale dei due seguire e risponde con un errore: va indicato il vincolo per nome,
`profiles!claims_profile_id_fkey`. Verificato contro PostgREST reale con tutte e quattro le
interrogazioni della coda (8 su 8 valide) prima di aprire la pagina.

**3. Il trigger sulla pubblicazione ha tre trappole in una riga.** (a) Se guardasse lo stato e non
il *passaggio*, correggere un refuso su un evento pubblicato lo riporterebbe in bozza: un errore di
battitura caccerebbe l'evento dal sito. (b) Se non escludesse l'admin, non si potrebbe pubblicare
più nulla. (c) Se non escludesse le operazioni **senza utente** (`auth.uid()` vuoto), le migration
e le scritture di servizio verrebbero riscritte in bozza. Tutte e tre le condizioni sono nella
stessa istruzione, e tutte e tre hanno una prova dedicata.

**4. Un profilo amministra una scheda sola — e nessuno lo diceva.** La prova in browser del giro
completo ha sbattuto contro `duplicate key value violates unique constraint "artists_profile_id_key"`,
in faccia all'utente. Il vincolo `UNIQUE (profile_id)` esiste dalla Fase 1 ed è coerente con tutto
il resto (una scheda per profilo, `getArtistByProfileId` singolare, "Crea evento" senza scelta di
identità). Ma era **invisibile**: l'interfaccia offriva "Reclama questa scheda" anche a chi
amministrava già una scheda, e la risposta era un messaggio del database in inglese. Le prove sulle
funzioni non potevano trovarlo — le funzioni erano giuste, era il *contratto* a essere muto. Sistemato
in quattro punti: le tre funzioni (`claim_artist`, `request_venue_claim`, `decide_claim`, quest'ultima
per la corsa di chi si prende una scheda mentre una sua richiesta è in coda) dicono la regola con
parole umane, e il pannello ha uno stato `owned` che **non offre** il pulsante. In più le due pagine
di onboarding rimandano all'account a chi una scheda ce l'ha già (prima potevano creare un doppione,
e `artists.profile_id` è `ON DELETE CASCADE`: cancellare quell'account avrebbe cancellato anche la
scheda).

**5. La regola "un utente non può riscrivere lo stato a mano" non si prova con una sottoquery.**
`update … returning` non è ammesso come sottoquery in un `select` (errore 42601): la prova usa una
CTE. Vale la pena annotarlo perché è il modo naturale di scrivere quella verifica, e sbagliarlo fa
sembrare rotta la policy invece del test.

## Scostamenti dal piano (dichiarati)

| Piano | Fatto | Perché |
| --- | --- | --- |
| `0011` = tabella `claims` + funzioni di reclamo | `0011` include anche **`verified_profile_ids()`**, la pulizia `search_path` di `slugify`/`set_unique_slug` segnalata dal linter e il trigger `events_require_review` | La verifica serve al badge pubblico (rimandato qui da 3.1) e il trigger è **la** regola decisa prima di costruire: tenerlo fuori avrebbe lasciato il database senza la regola che l'interfaccia promette. La pulizia del linter è di tre righe, e va fatta quando si tocca il file |
| — | Le regole "un profilo, una scheda" sono state aggiunte a `0011` **dopo** la prova che le ha trovate, e applicate con un secondo passo (`claims_un_modulo`) | `0011` era già applicata: le funzioni sono `create or replace`, quindi il file resta la verità e la storia mostra che la regola è stata affilata da una prova vera. Il database non è mai rimasto indietro rispetto al file |
| Editor eventi, bozze, limite per i non verificati in **3.3** | Qui c'è la **regola** sulle bozze (database); in 3.3 l'editor che le scrive e le mostra | "Chi non è verificato non pubblica" è una regola di sicurezza: vale dal primo evento scritto con l'editor, non dal giorno dopo |
| Verifica reversibile | Aggiunta la sezione **"Profili verificati"** in `/admin` con "Togli la verifica" (`set_profile_verified`) | Una decisione senza un modo per disfarla non è una decisione, è una condanna. La revoca del reclamo stacca la scheda ma **non** toglie la verifica: senza questo interruttore la verifica sarebbe irreversibile |
| Pannello di reclamo a quattro stati | Aggiunto lo stato **"amministri già una scheda"** e le due guardie di onboarding (scostamento 4) | Conseguenza diretta della trappola trovata in prova: meglio non offrire un pulsante che non può funzionare |
| — | Su entrambe le pagine di onboarding un rigo che manda a cercare la propria scheda prima di crearne una (`/artisti`, `/locali`) | Non è la soluzione completa (vedi B29), è l'avviso che evita il doppione più probabile: chi si registra e crea subito una scheda che esisteva già |
| — | Cancellato **`lib/auth.ts`** | Era un controllo admin basato sulla variabile d'ambiente `ADMIN_EMAIL`, importato da nessuna parte e **in contraddizione** con il database (`is_admin()`). Due verità sullo stesso fatto: una delle due sarebbe invecchiata. Resta solo quella del database |
| — | Sistemato l'**instradamento dei locali** in `RolePicker` e `RegisterForm` (finivano sulla home), e la stringa inglese fissa "Session expired…" in `OnboardingForm` | Un locale che si registrava non aveva nessuna strada per esistere: la funzione c'era (`venues_insert_own`) ma non la porta |
| Chiavi dizionario `unclaimedArtist` / `unclaimedVenue` | **Rimosse** (entrambe le lingue) | Il pannello di reclamo dice la stessa cosa con più precisione. Due testi paralleli sullo stesso stato diventano due testi disallineati |

## Prove fatte (tutte su dati reali)

**Regole del database** — dentro una transazione annullata alla fine, con identità simulate
(`set local role authenticated` + `request.jwt.claims`). Nessun dato reale toccato:

| Gruppo | Prove | Esito |
| --- | --- | --- |
| Reclamo artista | fan che prova a reclamare (rifiutato), prova mancante (rifiutata), reclamo riuscito, doppio reclamo (nessun errore), scheda già presa da altri (rifiutato), profilo locale su scheda artista (rifiutato), **chi amministra già una scheda artista (rifiutato con spiegazione)** | 8/8 |
| Richiesta locale | artista su scheda locale (rifiutato), richiesta riuscita e scheda **non** collegata, doppia richiesta dello stesso utente (rifiutata dal vincolo), secondo richiedente ammesso, **chi amministra già un locale (rifiutato con spiegazione)** | 6/6 |
| Decisione | non-admin che prova ad approvare (rifiutato), approvazione, scheda collegata, verifica implicita, richieste concorrenti chiuse da sole, doppia decisione (rifiutata), **la corsa: richiesta in coda da chi nel frattempo si è preso una scheda, per l'artista e per il locale (rifiutata con spiegazione)** | 8/8 |
| Revoca | revoca riuscita, scheda tornata a OpenStage, **verifica conservata**, richiesta revocata, revoca di una non approvata (rifiutata) | 5/5 |
| Verifica | non-admin (rifiutato), togliere la verifica, verifica di un profilo inesistente (rifiutata) | 3/3 |
| Pubblicazione | evento pubblicato da profilo non verificato → **bozza**; pubblicazione della bozza da non verificato → resta bozza; admin pubblica → pubblicato; modifica di un evento pubblicato da non verificato → **resta pubblicato**; scrittura **senza utente** → resta pubblicata; profilo verificato → pubblicato subito; admin → pubblicato | 10/10 |
| Badge pubblico | elenco dei profili verificati | 1/1 |
| **Totale** | | **47/47** |
| Policy di lettura | un utente vede solo le proprie; un anonimo non vede nulla; l'admin vede tutto; **nessuno può riscrivere lo stato a mano** (0 righe modificate) | 4/4 |

**Interrogazioni dell'admin contro PostgREST reale** (nome dei collegamenti compreso): 8/8 valide.

**In browser, su build di produzione** — 67 controlli, 0 falliti, zero errori in console:

| Giro | Controlli | Cosa copre |
| --- | --- | --- |
| Registrazione + reclamo | 31 | registrazione artista (con CAPTCHA reale), avviso di cercare la scheda esistente, reclamo immediato di `bobo-rondelli` con link di prova, nessun invito sulla propria scheda, `/account` (in attesa di verifica + collegamento alla scheda reclamata), guardia di onboarding, stato "amministri già una scheda" su una seconda scheda libera; registrazione locale, richiesta di `druso` che resta **in attesa** e non lo invita a richiedere di nuovo, `/account` che dice chiaramente che la scheda non c'è ancora; secondo locale che crea la propria scheda (`/onboarding/venue`), guardia di onboarding, stato "amministri già un locale" su un altro locale |
| Coda e pagine pubbliche | 36 | `/admin` 200 + noindex + quattro sezioni + richiesta di `Druso` con chi l'ha chiesta e la prova; **approvazione** → il locale è verificato, il badge appare, la scheda non è più "Non reclamato", `/account` del locale lo dice e l'onboarding rimanda all'account; **verifica** del reclamo dell'artista → badge sulla scheda pubblica; **"Togli la verifica"** → il badge sparisce e il locale **torna nella coda** delle schede da verificare; vista anonima: "reclamata da altri" senza badge, nessun invito; `/account` dell'artista verificato |

**Il giro è stato rifatto da zero due volte**, la seconda dopo aver corretto due *attese sbagliate
nel test* (non difetti): l'artista sulla propria scheda non vede nessuna scritta — è previsto, lo
stato sta nell'account — e il locale proprietario non vede "Scheda reclamata dal locale". La
seconda passata, con le attese giuste, è la tabella qui sopra: **67/67**.

Tutti i dati di prova sono stati creati, provati e **cancellati**: il database è tornato esattamente
al suo stato (0 reclami, 0 bozze, 0 profili verificati, 0 account di prova). Le schede vere sono
state staccate **prima** di cancellare gli account di prova, perché `artists.profile_id` è
`ON DELETE CASCADE` e cancellare l'account avrebbe cancellato anche la scheda.

## Cosa resta aperto (annotato nel backlog)

- B26: gli eventi in bozza non hanno un autore visibile in coda oltre all'email dell'account, e
  l'admin non può **rifiutare** una bozza (solo pubblicarla): la gestione (rifiuto, motivazione,
  notifica) arriva con l'editor in 3.3 e con le email in Fase 6.
- B27: la coda di moderazione non è paginata. A questa scala (una manciata di richieste) va bene;
  quando crescerà servirà la stessa paginazione delle directory.
- B28: la prova del reclamo è un link, non una verifica automatica: l'admin la apre a mano. Una
  verifica via email sul dominio del sito (o collegamento a una pagina che contiene un token)
  sarebbe più forte, ma richiede le email (Fase 6).
- B29: **chi si registra con il nome di una scheda che esiste già ne crea una seconda.** Ora
  l'onboarding lo avvisa e manda alla ricerca, ma la soluzione vera è cercare mentre si scrive il
  nome e proporre "è già la tua? reclamala". Il vincolo del database impedisce il *doppione nel
  profilo*, non il *doppione nella scheda*.
- B30: `/account` non dice che c'è una **richiesta di reclamo in attesa**: lo dice solo la scheda
  pubblica (dove il pannello scrive "Richiesta inviata"). Va aggiunta una riga in `/account` con
  la scheda richiesta.
- Resta valido B01 (protezione password compromesse, solo piano Pro).

## Rischi

- **Il trigger è una regola di sicurezza, non una comodità.** Se un domani una funzione scrivesse
  eventi con `auth.uid()` vuoto (per esempio un job di servizio), quella scrittura **non** verrebbe
  controllata. È voluto (le migration devono poter lavorare), ma va ricordato: `auth.uid()` vuoto
  significa "non è un utente", e in quel caso la responsabilità è di chi scrive.
- **`claims` cresce e non si cancella mai.** Oggi è un registro utile (chi ha preso cosa, quando):
  le richieste rifiutate e revocate restano. Se un giorno servirà una pulizia, va progettata
  sapendo che è **la** traccia delle decisioni.
- **La verifica è per profilo, non per scheda.** Un profilo verificato che reclama due schede
  risulterebbe verificato su entrambe. Coerente con "la verifica è della persona" — e con "un
  profilo, una scheda" oggi non capita — ma se un domani servisse la verifica per singola scheda,
  il modello va ripensato.
- **Un profilo amministra una scheda sola: è un vincolo del database, non una preferenza.** Per
  spostare una scheda da un profilo all'altro serve l'intervento dell'admin (revoca + nuovo
  reclamo). Se un giorno servisse un modo per unirlo da soli, va progettato: oggi la risposta è
  "chiedi all'amministratore", ed è scritta nell'interfaccia.
- La pagina `/account` è raggiungibile dal menu solo agli utenti collegati, ma l'indirizzo è
  digitabile: per chi non è collegato reindirizza al login (verificato).
