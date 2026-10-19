# Fase 3 — Directory, profili, reclamo, editor eventi e condivisione

> **Stato: divisione approvata il 17 ottobre 2026.** Il prompt ricevuto unisce quattro lavori che
> nella roadmap vivevano in fasi diverse; la divisione in blocchi è confermata, le decisioni prese
> sono elencate più sotto. Stato di avanzamento: **3.0, 3.1, 3.2, 3.2.1, 3.2.2, 3.2.3 e 3.2.4 fatti**, si
> prosegue con 3.3.

## Premessa: il prompt contiene quattro progetti

| Lavoro | Dove viveva nella roadmap | Peso |
| --- | --- | --- |
| Schede pubbliche + reclamo | Fase 3 (prima stesura) | medio |
| Directory `/artisti` e `/locali` con filtri | non prevista | medio |
| Dashboard + editor eventi (crea/modifica, locandine, bozze) | Fase 4 | **grande** |
| Condivisione: calendario, Share Cards, QR | Fase 5/7 | medio |
| Richiesta trasversale: SEO e immagini social | — | medio |

Tenerli in un blocco unico significherebbe una fase non verificabile a pezzi: la Fase 2 è stata
divisa in tre e ha funzionato. Qui servono **quattro blocchi** (più uno di fondamento, vedi sotto).

## Terreno verificato (fatti, non stime)

Letto direttamente dal database e dal codice:

- Nessuno `slug` su `artists`, `venues`, `events`. Nessuna `capacity` sui locali. Nessuna
  tabella notifiche. **Nessun bucket di Storage** (verificato: `storage.buckets` è vuoto):
  caricare una locandina richiede di crearne uno, con le sue policy.
- `profiles` non ha nessun concetto di "verificato". La regola richiesta ("gli utenti non
  verificati restano in bozza") **non ha oggi un dato su cui appoggiarsi** (la conferma email è
  spenta). Va definita: vedi decisioni.
- La posizione approssimativa **esiste già**: `events.location_precision` (`exact | approximate`)
  e `events.area_radius_m`. Non va inventata, va solo usata.
- `events.status` ha già `draft | published | cancelled`.
- `events_insert_authenticated` oggi consente a qualunque artista o locale di inserire un evento
  **direttamente pubblicato e senza alcun limite**: il tetto anti-spam va messo nel database,
  non nel form (un limite solo lato interfaccia si aggira).
- La propria scheda si crea **solo per gli artisti** (onboarding artista). **Non esiste** alcun
  modo per un locale di creare la propria scheda: oggi i locali si inseriscono a mano. Senza
  questo pezzo, un locale nuovo non può pubblicare nulla.
- Il sito non ha `sitemap.xml`, `robots.txt`, `canonical`, `hreflang` né immagine Open Graph:
  `getPageMetadata` scrive **solo** titolo e descrizione.
- `/artisti` e `/locali` sono segnaposto; `/events/new` è una pagina vuota che rimanda alla home.

## Il punto SEO più importante (e scomodo)

La lingua **non sta nell'URL**: è un cookie deciso dal paese (`middleware` →
`x-vercel-ip-country` → `localeFromCountry`). Conseguenze misurate sul codice:

1. Lo stesso URL serve italiano **o** inglese → `hreflang` è impossibile.
2. Googlebot arriva da IP statunitensi e senza cookie → riceve **la versione inglese**. La
   directory italiana, per Google, semplicemente non esiste.
3. `canonical` non esiste su nessuna pagina.

Costruire le directory "per la SEO" sopra questo impianto ne sfrutta **metà**. Due strade:

- **(A) lingua negli URL** (`/it/...`, `/en/...`) con `hreflang` + `canonical`: unico modo perché
  il contenuto italiano sia indicizzabile. Costa un blocco a sé (tocca tutti i link interni) e va
  fatto **prima** delle directory, altrimenti gli URL cambiano due volte.
- **(B) rimandare**: più veloce oggi, ma la SEO di questa fase resta in gran parte sprecata e la
  correzione costerà di più (tutti gli URL di nuovo, più redirect).

## Blocchi proposti

### 3.0 — Lingua e URL ✅ fatto

`/it/...` e `/en/...`, scelta lingua dall'URL (il cookie resta solo come preferenza per il primo
redirect), `hreflang` + `canonical` su ogni pagina, switcher che cambia lingua **cambiando
indirizzo**, redirect di cortesia per chi arriva senza prefisso. Nessuna funzione nuova visibile:
è il fondamento su cui la SEO funziona davvero. Dettagli e prove in `docs/review-fase-3.0.md`.

### 3.1 — Fondamenta dati, schede pubbliche e directory ✅ fatto

> Fatto. Cosa è stato realizzato davvero, le due trappole trovate (tabella accenti disallineata,
> rotta evento che la build non intercettava) e gli scostamenti da questo piano — reclamo e badge
> "Verificato" spostati a 3.2, migration divise per blocco — sono in `docs/review-fase-3.1.md`.

- Migration `0009_directory_claims.sql`: `slug` su `artists`, `venues`, `events` (+ backfill
  deterministico, `translate` senza `unaccent`), `venues.capacity`, `profiles.verified_at`,
  tabella `claims` + RLS, funzioni `claim_artist` / `request_venue_claim` / `review_claim`,
  estensione delle policy `events_*` alla proprietà via `venue_id` / `artist_id`, ridefinizione
  di `is_unclaimed` come "nessuno dei soggetti collegati ha reclamato" — **promessa non mantenuta
  qui**: la colonna salvata è rimasta quella della Fase 1, e si è corretta solo nella 3.2.2
  (dove è stata tolta del tutto, perché il valore si calcola).
- Directory `/artisti` e `/locali`: griglia reale, filtri (nome, genere, città / città, capienza,
  "solo non reclamati"), paginazione, **link veri** (crawlable), `ItemList` JSON-LD.
- Schede `/artisti/[slug]` e `/locali/[slug]`: dati reali, eventi futuri collegati, link
  (Spotify, sito, mappa), `MusicGroup` / `MusicVenue` JSON-LD, stato "non reclamato" con invito.
- Pagina evento: URL `/eventi/[citta]/[slug]` con **301** dal vecchio `/eventi/[id]`,
  `canonical`, `MusicEvent` JSON-LD. Gli eventi passati restano raggiungibili (200, non 404):
  si perdono link solo se la pagina sparisce.
- `app/sitemap.ts` (eventi, artisti, locali dal database) e `app/robots.ts`.

**Test**: `/artisti` mostra le schede vere e i filtri aggiornano l'URL; la scheda di un artista
carica i suoi concerti; il vecchio link `/eventi/<uuid>` porta al nuovo indirizzo; `sitemap.xml`
elenca le righe realmente presenti.

### 3.2 — Reclamo, area personale e revisione

> **Fatto.** Cosa è stato realizzato davvero, le quattro trappole trovate (il reclamo non può
> passare dalla RLS, l'ambiguità dei collegamenti in `claims`, le tre condizioni del trigger sulla
> pubblicazione, la verifica reversibile) e gli scostamenti dichiarati sono in
> `docs/review-fase-3.2.md`.

- Scheda artista non reclamata → "Sono io" → conferma + link di prova → **immediato** (`claimed_at`,
  prova registrata, revoca possibile dall'admin).
- Scheda locale non reclamata → "Sono il gestore" → prova + messaggio → **richiesta**; l'admin
  approva o rifiuta. Prima approvata vince, le altre richieste pendenti si chiudono da sole.
- Chi non ha il ruolo giusto viene guidato a sceglierlo, con avviso esplicito che è irreversibile.
- **Creazione della propria scheda locale** ("Aggiungi il tuo locale"): nome, città, indirizzo,
  coordinate dal pin, sito — la riga nasce già propria. Senza questo un locale nuovo non parte.
- `/admin` minimale: coda delle richieste, approva / rifiuta; da qui anche `verified_at`.
- **Una scheda per profilo** (vincolo `UNIQUE (profile_id)` che esiste dalla Fase 1): chi ne ha già
  una non ne prende un'altra. L'interfaccia lo dice e non offre il pulsante, invece di far arrivare
  un errore del database (trovato dalla prova del giro completo, vedi `docs/review-fase-3.2.md`).

**Test**: artista reclama e diventa proprietario; secondo tentativo bloccato; locale invia la
richiesta e resta "in attesa" finché l'admin non approva; ruolo sbagliato respinto con spiegazione.

### 3.2.1 — Correzione del reclamo (dopo la prova dell'utente)

> **Fatto.** La prova dell'utente ha bocciato la 3.2: chi si iscriveva come fan, diventava artista e
> poi reclamava finiva in un vicolo cieco (la scheda creata dal primo passo gli impediva di prendere
> quella vera), e l'interfaccia prometteva all'admin un permesso che il database negava. Cronaca,
> trappole e prove in `docs/review-fase-3.2.1.md`.

- **Il primo passo cerca, poi crea**: `/onboarding/artist` e `/onboarding/venue` si aprono con la
  ricerca tra le schede **reali**; il modulo di creazione è la seconda strada.
- **Una scheda senza eventi si sostituisce** (`free_vacant_page`): reclamando si elimina la propria
  scheda vuota, con avviso esplicito che la nomina. Una scheda **con eventi** no: lì decide l'admin.
- **Chi ha il ruolo sbagliato viene guidato**: il fan riceve l'invito a scegliere il ruolo (con
  l'avviso che è definitivo), chi ha già un altro ruolo riceve la spiegazione.
- **L'admin può reclamare** (database allineato all'interfaccia); **verifica e revoca** restano
  proprietà del **profilo**, non della scheda: sostituendo la scheda la verifica resta.
- **Corretto un guasto preesistente**: `decide_claim` usava `p_note` invece di `p_nota`, quindi
  **approvare un reclamo di locale falliva** sempre (i reclami artista non passano di lì, per questo
  non si era visto). E `revoke … from public` non bastava: Supabase concede `execute` ad `anon` e
  `authenticated` per conto suo.

**Test**: 43 prove sul database (transazione annullata) e 46 controlli in browser del giro completo
(fan guidato → artista → ricerca → reclamo → scheda vuota eliminata; locale → richiesta → coda
admin → approvazione → badge "Verificato").

### 3.2.2 — "Non reclamato" non è più un campo salvato (dopo la prova dell'utente)

> **Fatto.** L'utente ha notato che l'evento di Bobo Rondelli aveva ancora `is_unclaimed = true`
> dopo il reclamo della scheda. La colonna era un residuo della Fase 1: scritta all'inserimento e
> **mai più aggiornata** (nessun trigger, nessuna scrittura dell'app). Cronaca e prove in
> `docs/review-fase-3.2.2.md`.

- **La colonna è stata eliminata** (`alter table public.events drop column is_unclaimed`): era una
  seconda verità, e non seguiva la realtà.
- **Il valore si calcola dalle schede**: un evento è "inserito da OpenStage" quando artista **e**
  locale non hanno ancora reclamato (`profile_id is null`). Basta **un** reclamo e la nota sparisce.
  Un evento senza né artista né locale non ha schede da reclamare: nessuna nota.
- **Regola in un posto solo**: `toPublicEvent` (elenco, mappa, home, pagina evento). La ricerca
  `search_events` restituisce i due `profile_id` per poterlo fare anche lì.
- **Testo della nota** aggiornato: nomina entrambi i soggetti, non più solo il locale.

**Test**: l'evento di un artista reclamato non porta più la nota; quello con entrambe le schede
libere sì; reclamando l'una o l'altra la nota sparisce (prove su schede reali + due eventi di prova
creati e rimossi).

### 3.2.3 — La richiesta in attesa si vede, blocca e si può ritirare (B34, prima della 3.3)

> **Fatto.** L'utente ha chiesto di sistemare la richiesta di reclamo in attesa. Cronaca e prove in
> `docs/review-fase-3.2.3.md`.

- **Una richiesta in attesa alla volta** per profilo: `request_venue_claim` rifiuta la seconda con un
  messaggio chiaro. Così il blocco ha un solo caso da spiegare e l'account una sola riga da mostrare.
- **Finché è in attesa non si creano schede**: un trigger (`block_page_with_pending_claim`) su
  `artists` e `venues`, non solo il modulo nascosto. La RLS da sola darebbe un errore generico.
- **Si può ritirare**: `withdraw_claim`, per il richiedente stesso (prima poteva solo l'admin, con
  `revoke_claim`). Nuovo esito `withdrawn` in `claims.status`.
- **La propria scheda non si tocca all'invio**: `request_venue_claim` non elimina più la scheda vuota
  di chi chiede; la elimina `decide_claim` **all'approvazione**. Prima bastava premere "Richiedi
  questa scheda" per perdere la propria scheda con i dati dentro, anche se la richiesta veniva poi
  rifiutata: è la spiegazione dell'utente che "la città è diventata null".
- **Dov'è il riquadro**: `/account` (scheda richiesta, data, pulsante di ritiro) e, per il locale,
  il primo passo `/onboarding/venue`. Sulla scheda di un **altro** locale il pannello del reclamo
  spiega la richiesta in attesa invece di offrire un pulsante che fallirebbe (`pendingElsewhere`).
- **Città del profilo**: il campo "Città (opzionale)" **esce dalla registrazione**. `profiles.city`
  era un campo morto: scritto solo all'iscrizione con email, mai letto, mai modificabile, e per gli
  accessi con Google nemmeno raccolto. La città vive dove serve — sulla scheda dell'artista e del
  locale. La colonna resta inutilizzata (nessuna migrazione dei dati: era già vuota ovunque).

**Test**: batteria sul database (20 controlli in transazione annullata) + giro completo in browser
con una sessione vera (19 controlli): richiesta dalla pagina → riquadro in `/account` → modulo di
creazione assente → spiegazione sull'altra scheda → creazione **rifiutata dal database** anche
chiamando l'API con il token vero → ritiro → creazione di nuovo permessa. Console pulita.

### 3.2.4 — Domanda dell'utente sull'accesso: messaggi in italiano e una voce di sicurezza

> **Fatto.** L'utente ha notato che iscriversi via Google con un'email già registrata fa partire
> l'accesso, mentre la registrazione con email e password viene rifiutata. Il comportamento è
> corretto (unione automatica delle identità, Supabase), ma la verifica ha fatto emergere due cose:
> i messaggi di errore di Supabase arrivano **in inglese**, e sul progetto la **conferma dell'email è
> disattivata**. Cronaca e prove in `docs/review-fase-3.2.4.md`.

- **Messaggi tradotti** (`lib/auth/error-messages.ts`, usato dall'accesso e dalla registrazione):
  email già registrata, credenziali errate, email da confermare, troppi tentativi, verifica anti-bot.
  Nei primi due il messaggio indica la via d'uscita: «Continua con Google».
- **Niente più "controlla la tua email" a vuoto**: quando l'email esiste già, Supabase risponde senza
  errore e senza sessione, per non rivelare chi è iscritto. Il modulo riconosce quella risposta
  (nessuna identità collegata) e dice invece che l'email è già registrata.
- **Due voci nel backlog, nessun cambio di comportamento**: **B35** (la conferma dell'email va accesa
  insieme a Resend: con l'auto-conferma si può *ereditare* l'account di un altro passando da Google) e
  **B36** (manca il flusso "password dimenticata").

### 3.3 — Dashboard e creazione eventi

- Dashboard con sidebar desktop / barra mobile: **I miei eventi, Crea evento, Preferiti, Profilo,
  Impostazioni** (vedi decisioni su "Notifiche").
- "I miei eventi": bozze, pubblicati, annullati; azioni pubblica / annulla / modifica.
- `/dashboard/events/new`: form con **anteprima live della scheda**; titolo, artista, data/ora,
  locale, indirizzo con autocomplete + mini mappa con pin trascinabile, genere, tipo, locandina,
  link biglietti, prezzo o ingresso gratuito, link Spotify; **posizione approssimativa**.
- Locandina: upload su Storage **e** generatore canvas 1-click dai dati inseriti (stessa
  libreria di disegno delle Share Cards).
- Anti-spam: **massimo 10 eventi per account nelle 24 ore, imposto nel database**; gli account non
  ancora verificati restano in bozza (regola applicata dal database, non dal form).

**Test**: si crea un evento reale, appare in "I miei eventi" e — se pubblicato — nella ricerca;
l'11° evento della giornata viene rifiutato; l'account non verificato resta in bozza.

### 3.4 — Pagina evento completa e condivisione

- Hero con locandina, **countdown**, azioni: Salva, Aggiungi al calendario, Condividi, Biglietti,
  Indicazioni Google Maps.
- `.ics` (route handler, nessuna dipendenza) + link Google Calendar.
- Modale di condivisione con **Share Cards generate nel browser**: Storie 1080×1920 e Quadrato
  1080×1080, con QR code del link canonico; su mobile condivisione nativa via Web Share API,
  altrimenti download del PNG.
- Immagine Open Graph **generata dal server** (`next/og`, incluso in Next: nessuna dipendenza
  nuova) per la pagina evento e le schede: i crawler social non eseguono il canvas.

**Test**: il countdown scorre; il `.ics` si apre nel calendario del telefono; la Share Card si
scarica a 1080×1920 con QR funzionante; incollando il link in una chat compare l'anteprima giusta.

## Decisioni prese (17 ottobre 2026)

| # | Domanda | Decisione |
| --- | --- | --- |
| 1 | Lingua negli URL | **Blocco 3.0**, fatto → `docs/review-fase-3.0.md` |
| 2 | "Badge Pro" nella directory | Diventa **"Verificato"** (`profiles.verified_at`, dato reale). "Pro" collide con "gratis per sempre" e non esiste alcun piano a pagamento |
| 3 | Voce "Notifiche" nella dashboard | Sostituita da **"Preferiti"** (B19: i salvataggi esistono già, mancava la pagina) |
| 4 | Autocomplete indirizzi | **Photon (komoot)**: nessuna chiave, nessun account. MapTiler richiede una chiave e il piano gratuito è solo non commerciale |
| 5 | "Utenti non verificati restano in bozza" | **Primo evento in revisione, poi pubblicazione automatica** (`profiles.verified_at` impostato dall'admin) |
| 6 | "Ricordamelo" | **Solo "Aggiungi al calendario"** (`.ics` + Google Calendar). Il promemoria via email arriva con Resend (Fase 6) |
| 7 | URL evento | **`/eventi/[citta]/[slug]`**, coerente con `/artisti` e `/locali`; 301 dal vecchio `/eventi/[id]` |
| 8 | Widget player Spotify nella griglia artisti | **Fuori dalla griglia** (un iframe per scheda è pesante e le playlist non esistono ancora): pulsante "Ascolta" per riga, player solo sulla scheda del singolo artista |

## Servizi esterni, variabili e SQL

- **Servizi nuovi**: nessuno, se si sceglie Photon. Con MapTiler servirebbe un account, una chiave
  e un piano a pagamento per l'uso commerciale.
- **Da configurare su Supabase (una volta)**: bucket di Storage `covers` (pubblico in lettura,
  scrittura solo al proprietario, limite di dimensione e soli tipi immagine). Lo creo via SQL
  dentro la migration, ma va deciso il limite di spazio (piano gratuito: 1 GB).
- **Variabili d'ambiente nuove**: **nessuna** con Photon. Nessuna chiave per `next/og`.
- **SQL**: una migration per blocco, applicate e verificate prima del test in produzione:
  `0009` slug + capienza + `verified_at` ✅, `0010` funzioni di ricerca con lo slug ✅,
  `0011` reclamo (3.2) ✅, `0012` proprietà del reclamo (3.2.1) ✅,
  `0013` "non reclamato" calcolato (3.2.2) ✅, `0014` richiesta in attesa: blocco e ritiro (3.2.3) ✅,
  `0015` editor/bozze/limite (3.3).

## Cosa resta fuori

- Email transazionali (Resend) e quindi notifiche email → Fase 6 (B08).
- Pagamenti, PayPal e qualsiasi "piano Pro" → Fase 8 (B16). Vercel Hobby resta non commerciale.
- Cancellazione account (B07) e rifinitura estetica (B12: è la fase finale, come deciso).

## Verifiche di fine fase

- `npm run build` verde; prova in browser reale in locale e in produzione, italiano e inglese,
  desktop e mobile; nessun errore in console.
- Ogni blocco verifica il proprio pezzo **senza** dipendere dal successivo.
- Solo dati reali: nessun evento, artista o locale finto, in nessun blocco.

## 3.4 — Pagina evento completa e condivisione (fatta il 19 ottobre 2026)

**Cosa c'è adesso sulla scheda.** La locandina si vede **intera** in una colonna a sinistra (su
desktop) con accanto tipo, titolo, artista e **countdown**; sotto, "Quando" e "Dove" come prima,
e la fila di azioni: Biglietti, Salva, **Aggiungi al calendario**, **Condividi**.

**Decisioni prese costruendo:**

1. **Countdown nel browser, non sul server.** L'ora del server e quella del telefono non coincidono
   e un conto fatto una volta invecchia subito: il numero si calcola al montaggio e si aggiorna ogni
   30 secondi (`components/events/EventCountdown.tsx`). Prima del montaggio non si mostra niente
   (niente schermata che cambia sotto gli occhi). Sparisce quando la serata è cominciata: non
   sappiamo a che ora finisce, e "è iniziata" non serve a chi legge.
2. **Il calendario è un `<details>`, non un menu JavaScript.** Due link veri — Google Calendar e il
   file `.ics` — funzionano anche se lo script non parte (`components/events/AddToCalendar.tsx`).
   Il file lo costruisce il server (`lib/events/calendar.ts`, `app/api/events/[id]/ical/route.ts`):
   date in **UTC** (l'ora legale la risolve il calendario di chi legge), durata presunta di **3 ore**
   quando l'ora di fine non esiste, `UID` uguale per sempre (`<id>@openstage`), righe spezzate a 75
   byte, virgole e a capo protetti. Su una serata **annullata** il file dice `STATUS:CANCELLED` con
   lo stesso `UID`: chi l'aveva in calendario e riscarica il file la vede sparire, invece di
   presentarsi davanti a un portone chiuso. La città non si ripete quando l'indirizzo la contiene già.
3. **Il pannello di condivisione disegna le card nel browser.** Un `<dialog>` nativo
   (`components/events/ShareEventPanel.tsx`): **Storia 1080×1920** e **Quadrato 1080×1080**, con la
   locandina intera, titolo, quando, dove e un **QR** che porta all'indirizzo canonico **con la
   lingua**. Il disegno parte all'apertura e si rifà solo se si cambia formato: chi non condivide
   non paga niente. Uscita: foglio di sistema con l'immagine (dove esiste), download del PNG, o
   copia del link.
4. **Le matite sono le stesse della locandina.** Foto, aloni, titolo che si rimpicciolisce, testo
   andato a capo: estratti in `lib/covers/canvas.ts` e usati sia da `flyer.ts` (1080×1350) sia da
   `share.ts`. Una sola implementazione da correggere. La libreria `qrcode` (npm, ~15 kB, disegno
   locale) è l'unica dipendenza nuova di tutto il blocco.
5. **Una serata annullata si annuncia.** Nella card il prezzo lascia il posto a un badge rosa
   "Annullato" e a una riga che dice di condividere l'annuncio, non un invito; nel pannello compare
   lo stesso avviso. Niente countdown, niente "Salva", niente "Biglietti", niente calendario:
   Condividi resta, perché è l'unico gesto utile.
6. **Un approssimativo non manda a un punto finto.** Il link "Apri in Google Maps" cerca
   `Locale, Città` invece delle coordinate: chi va decide l'ultimo tratto, con le indicazioni scritte
   a mano ("Come arrivare") accanto.
7. **L'anteprima social è una card disegnata dal server**, non la locandina grezza:
   `app/api/og/event/[id]/route.ts` + `lib/seo/og-card.tsx` (1200×630, fondo scuro, neon, locandina
   intera, tipo, titolo, data, luogo, firma). La lingua viaggia nell'indirizzo (`?lang=`) e la
   risposta si mette in cache un'ora. La locandina si scarica **dentro la rotta** con un tetto di
   2,5 secondi: se l'archivio non risponde, la card esce lo stesso senza foto. Non è un
   `opengraph-image.tsx` accanto alla pagina perché la scheda sta su una cattura multipla
   (`/eventi/[...percorso]`) e Next rifiuta i file di metadati lì dentro: il server si avviava e ogni
   richiesta moriva con *Catch-all must be the last part of the URL*. Aggiunta anche
   `twitter: { card: "summary_large_image" }` nel layout: WhatsApp e X usano la card grande.

**Prove fatte** (server di produzione locale, dati reali, nessun mock):

- **17 prove browser** sulla scheda "Sick Tamburo": countdown ("Fra 11 giorni"), menu calendario,
  `.ics` valido, pannello di condivisione, **Storia 1080×1920**, **Quadrato 1080×1080**, QR presente
  in entrambe, PNG scaricato davvero su disco (1080×1080), chiusura con Esc, nessun countdown su una
  serata passata, zero errori in console.
- **Il QR è stato verificato modulo per modulo**: la matrice da 33×33 moduli campionata dentro
  l'immagine disegnata è **identica** a quella che la libreria produce per
  `http://localhost:3101/it/eventi/ranica/sick-tamburo` (0 moduli diversi). Non "c'è un QR": dice
  l'indirizzo giusto.
- **13 + 18 prove** su una serata di prova **approssimativa** (inserita e poi cancellata, per non
  lasciare righe finte): prima e dopo l'annullamento. Prima: indicazioni per zona, countdown,
  calendario, `.ics` `CONFIRMED`. Dopo: avviso in pagina, niente countdown/calendario/Salva/Biglietti,
  `.ics` `CANCELLED`, card con badge rosa (975 pixel rosa nella zona del badge) e avviso nel pannello,
  `noindex` sulla scheda, card Open Graph 1200×630 con l'etichetta rosa (619 pixel) e senza
  (0 pixel) quando la serata si tiene.
- Rotte: `.ics` 404 su un identificativo inesistente, card Open Graph 404, `/eventi/<id>` → **308**
  verso l'indirizzo canonico, scheda in inglese con i testi nuovi.
- Database lasciato com'era: 5 eventi, 0 annullati, 0 `event_creations`.

**Copertura onesta.** Il QR non è stato provato con una fotocamera vera (la prova confronta i
moduli, non l'inquadratura); il `.ics` è stato letto come testo e non aperto in Outlook o su iPhone;
le card non sono state viste a occhio su Instagram. L'endpoint dell'anteprima è pubblico e senza
contatore: la cache di un'ora lo tiene a bada, se crescerà servirà un tetto (vedi B45).
