# Diario delle fasi

Questa è la memoria del progetto: per ogni fase, cosa è stato costruito, quali decisioni sono
state prese e perché, cosa è stato rimandato. Serve per non dover ricostruire a posteriori il
ragionamento dietro una scelta.

## Fase 1 — Fondamenta

**Obiettivo:** mettere in piedi la piattaforma "vera" fin dal primo giorno: database reale,
accesso reale, niente dati finti o schermate di esempio.

**Cosa è stato costruito**

- Progetto Next.js 15 (App Router, TypeScript) con Tailwind v4, tutte le pagine pubbliche
  renderizzate lato server.
- **Design system** dark cyber-neon: sfondo `#07070D`, accenti viola/ciano/rosa, font Space
  Grotesk + Inter, navbar e footer in vetro, card con gradiente.
- **Doppia lingua IT/EN** con dizionari modulari, scelta automatica in base al paese e
  selettore manuale ricordato nel cookie `NEXT_LOCALE`.
- **Accesso reale** con Supabase: registrazione email + password, accesso con Google, captcha
  Cloudflare Turnstile, gestione della sessione con cookie (`@supabase/ssr`) rinnovata dal
  middleware.
- **Ruoli** (fan / artista / locale / admin) scelti in registrazione e memorizzati nel profilo.
- Pagine: Home, Artisti, Locali, Per gli Artisti, Per le Venue, Chi siamo, Contatti, Privacy,
  Termini, Cookie, più l'elenco di artisti e locali **letto dal database** con paginazione.
- **Player Spotify** predisposto in fondo a ogni pagina: il componente è montato nel layout, ma
  resta **spento** finché non viene configurata una playlist pubblica
  (`NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID`), perché non deve mostrare player vuoti o contenuti finti.
  Navigazione mobile a tendina dalla barra in alto (**non** esiste una barra fissa in basso).
- Prima migrazione SQL (`0001_init.sql`) con tabelle, RLS e trigger.
- Repository GitHub + deploy continuo su Vercel.

**Decisioni e perché**

- **Supabase scelto** rispetto a Neon+Clerk, Nhost, Appwrite, Firebase e Turso: è l'unico che
  unisce Postgres puro e Row Level Security legata all'utente loggato.
- **La scelta del ruolo sta dopo l'accesso con Google**, non nell'URL di ritorno: passare
  `?role=` avrebbe significato fidarsi di un parametro che il browser può cambiare.
- **Conferma email disattivata** in questa fase, per poter provare subito i flussi senza un
  servizio di invio email già configurato.
- Elenchi con **paginazione a 12 elementi** e query fatte sul database (nessun dato di esempio).

**Verifiche superate:** build di produzione senza errori; pagine pubbliche 200 in produzione;
i percorsi protetti rimandano al login; ruoli e profili verificati via SQL.

**Rimandato:** mappa, eventi reali, schede artista/locale complete, ricerca, email.

## Fase 1.2 — Indurimento del database

**Obiettivo:** sistemare il database *prima* che contenga dati veri, quando correggere costa
poco.

**Cosa è stato costruito** (`0003_hardening.sql`)

- `search_path` fissato sulla funzione che aggiorna `updated_at` (evita di eseguire funzioni
  sbagliate per errore).
- Revoca dell'esecuzione diretta delle funzioni interne di registrazione e di controllo ruolo.
- **3 indici sulle chiavi esterne** di `events` (le ricerche future ne hanno bisogno).
- **12 policy riscritte** con `(select auth.uid())`, che Postgres valuta una volta sola per
  query invece che riga per riga: è il modo corretto e più veloce.
- **Policy duplicate unite** su `profiles` (da 18 a 16 policy totali).
- **Storico migrazioni regolarizzato**: le voci `0001`…`0003` allineate ai nomi dei file, così
  gli strumenti Supabase e il repository raccontano la stessa storia.

**Verifiche superate:** il trigger di registrazione crea ancora il profilo; l'utente può
cambiare il proprio ruolo ma non promuoversi ad admin; un utente normale vede una sola riga di
`profiles`; i visitatori anonimi non vedono profili né impostazioni; gli avvisi di performance
(`auth_rls_initplan`, indici mancanti, policy multiple) sono spariti.

**Rimandato:** attivazione della protezione "password compromesse" (richiede un intervento in
dashboard) e la revoca di alcuni token di servizio usati durante la configurazione.

## Fase 1.3 — Ruoli definitivi

**Obiettivo:** una volta scelto, il ruolo non si cambia più; solo un fan può diventare artista
o locale, una volta sola.

**Cosa è stato costruito** (`0004_role_lock.sql` + interfaccia)

- **Nuova regola nel database**: l'unica transizione consentita è `fan → artista | locale`.
  Da artista o locale non si torna indietro, e non ci si promuove ad admin.
- **La RLS chiede il ruolo coerente**: per creare una riga `artists` bisogna essere artista,
  per `venues` bisogna essere locale, per un evento bisogna essere artista o locale. Un fan
  che prova a farlo via API viene **respinto dal database**, non solo nascosto dall'interfaccia.
- **Correzione di un difetto ereditato dalla Fase 1**: il trigger annullava anche
  l'assegnazione del ruolo `admin` al profilo dello staff (durante la registrazione non esistono
  i dati di sessione). Ora funziona e l'account dello staff è allineato.
- **Interfaccia**: badge colorato del ruolo nella barra in alto, link contestuale ("Diventa
  artista o locale" per un fan, "Crea evento" per artista/locale), pagina di scelta del ruolo
  riservata ai fan (chi è già artista o locale vede "Il tuo ruolo è già attivo"), pagine
  protette per ruolo.
- **Pulsante di scelta più onesto**: avvisa che la scelta di Artista/Locale è definitiva e,
  dopo il salvataggio, **rilegge dal database** il ruolo effettivo: se il database non l'ha
  accettato, l'utente vede un errore invece di una finta riuscita.
- **Testo corretto**: il sottotitolo della scelta del ruolo diceva "potrai cambiarlo quando
  vuoi", che con le nuove regole era falso.
- Helper riutilizzabili: `lib/auth/roles.ts` (permessi) e `lib/supabase/session.ts`
  (utente + ruolo in una sola lettura per richiesta).

**Verifiche superate:** artista → locale/fan/admin annullati; locale → fan annullato;
fan → artista e fan → locale riusciti e poi bloccati; fan respinto (errore 42501) quando prova
a creare righe artista o eventi; artista autorizzato; correzione da parte dell'admin possibile;
build e produzione verdi; nessun peggioramento negli avvisi di sicurezza.

**Rimandato:** nulla di bloccante. Le regole verranno estese alle future tabelle (per esempio
ai preferiti) man mano che nascono.

## Fase 2 — Scoperta degli eventi

**Obiettivo:** rendere la piattaforma utile per ciò che serve davvero — trovare il concerto di
stasera — con dati reali, nessuna schermata di esempio.

**Cosa è stato costruito** (tre blocchi: 2.1, 2.2, 2.3)

*2.1 — Mappa ed eventi*

- **Mappa interattiva** con MapLibre GL JS e **OpenFreeMap**: nessuna chiave API, nessun
  account, uso commerciale consentito, attribuzione obbligatoria. L'indirizzo dello stile è
  isolato in `lib/map/config.ts`.
- **Globo 3D** con la proiezione nativa di MapLibre e una rotazione introduttiva che parte solo
  su desktop e solo se il sistema non chiede "meno animazioni".
- **Pin degli eventi raggruppati per locale**: un locale con più serate ha un pin solo con il
  numero delle date, altrimenti i pin si sovrappongono e solo l'ultimo è cliccabile.
- **Scheda del pin** con data e ora nel fuso dell'evento, titolo, artista, locale, genere, tipo,
  ingresso gratuito e i pulsanti *Pagina evento*, *Biglietti*, *Apri in Google Maps*, *Salva*,
  *Condividi*.
- **Posizione approssimata**: un evento può dichiarare un'area invece di un indirizzo esatto, e
  la pagina evento lo spiega.
- **Pagina evento** `/eventi/[id]` con rendering lato server, dati strutturati e anteprima
  social; il titolo della serata è quello ufficiale della fonte, e la riga dell'artista sparisce
  quando coincide con il titolo.
- **Modalità a tutto schermo** `/mappa` con gli stessi filtri della Home.
- **Gesture mobile native**: un dito scorre la pagina, la mappa si muove solo a tutto schermo o
  con due dita.
- **Salvataggio reale** degli eventi (`saved_events` + RLS + server action).
- **Artisti senza account**: `artists.profile_id` diventa nullable, simmetrico ai locali. Serve
  per gli eventi reali inseriti dalla redazione.

*2.2 — Ricerca e filtri*

- **Barra di ricerca** con suggerimenti raggruppati (città, artisti, locali, eventi, generi)
  presi dal **nostro** database: nessun geocoder esterno.
- **Filtri rapidi**: stasera, questo weekend, questa settimana, prossimi 30 giorni, raggio in km,
  genere, tipo di evento, ingresso gratuito.
- **Tutto lo stato vive nell'URL**: un link filtrato è condivisibile, la pagina si compone lato
  server, e lista e mappa leggono gli stessi parametri.
- **Ricerca e filtri in una funzione SQL** (`search_events`), non con filtri lato applicazione:
  ricerca testuale su più tabelle e paginazione corretta *con la distanza*.
- **Preset temporali su `Europe/Rome`** calcolati con `Intl`: corretti anche al cambio dell'ora
  legale, senza librerie di date.
- Il **centro del raggio** va nell'URL: un raggio ha senso solo con un centro, e così resta
  condivisibile. La posizione precisa resta dietro "Vicino a me".

*2.3 — Vetrina*

- **Schede / Tabella**: la stessa lista in due modi, con paginazione a 12 e i filtri mantenuti
  cambiando pagina.
- **"In evidenza"**: fino a tre serate scelte a mano dallo staff, **mai pagate**, con una
  scadenza reale (`featured_until`). La sezione resta nascosta finché non c'è almeno una serata
  scelta, e sparisce mentre si filtra.
- **Bento grid con contatori reali** (eventi, artisti, locali, città): i numeri sono scritti nel
  HTML dal server, quindi veri anche senza JavaScript; l'animazione è solo un di più.
- **Stato vuoto** che invita a segnalare locali e artisti quando il database è ancora piccolo.

**Decisioni e perché**

- **OpenFreeMap invece di MapTiler**: MapTiler richiede account e chiave API; OpenFreeMap no,
  consente l'uso commerciale e si "paga" con l'attribuzione. Rischio accettato: è un'istanza
  finanziata da donazioni, senza garanzie di servizio. Mitigazione: l'URL dello stile è in un
  punto solo.
- **Niente Globe.gl**: la proiezione globo è nativa in MapLibre, quindi zero dipendenze in più.
- **Un pin per locale**: tre concerti nella stessa sala erano tre pin sovrapposti.
- **I suggerimenti vengono dal nostro database**: coerenza con "niente dati finti", nessun costo.
- **Filtri nel database, non nell'app**: con i filtri lato client la paginazione con la distanza
  sarebbe sbagliata.
- **"In evidenza" non è pubblicità**: le serate le sceglie lo staff, non si può pagare per
  comparire.
- **Eventi reali inseriti uno alla volta**, mai inventati. Quando li inserisce la redazione,
  l'evento è marcato `is_unclaimed` finché il locale o l'artista non reclamano la scheda.

**Verifiche superate:** build verde; verifica in browser reale (Chrome headless) **in locale e
in produzione**, in italiano e in inglese, desktop 1440 px e mobile 390 px; ricerca, filtri e
raggio provati con i dati reali; RLS provata impersonando gli utenti; scroll della pagina
conservato quando si filtrano i risultati; zero errori in console.

**Correzioni dopo la chiusura della fase** (segnalate provando la produzione)

- Il **pop-up di un locale con più serate usciva dalla mappa** e si tagliava: ora le serate si
  scorrono **una alla volta** con le frecce numerate `‹ 1 / 3 ›` e la scheda ha altezza costante;
  il margine della mappa va dal lato giusto (in alto per il pop-up desktop, in basso per il
  pannello mobile, che ha anche un tetto di `70vh`).
- **La pagina tornava in cima** usando ricerca e filtri: la causa principale era una versione
  precedente senza `scroll: false`. Restavano due casi reali, sistemati: il pulsante "Azzera i
  filtri" non aveva `scroll: false`, e i menu a tendina nativi su mobile possono saltare in cima
  comunque. Ora c'è `useScrollAnchor`, che ripristina la posizione **solo** se il browser ha
  davvero saltato.

**Rimandato:** pagina dei preferiti (B19), fuso del visitatore nei preset temporali (B20), indici
trigram nella ricerca (B21), test automatici end-to-end (B05), editor degli eventi (Fase 4).

## Fase 3 — Directory, reclami, editor e condivisione

**Obiettivo:** trasformare le schede e l'archivio in uno strumento usabile da artisti e
locali veri, non solo dalla redazione.

**Cosa è stato costruito** (blocchi 3.0 → 3.4)

- **Lingua negli URL**: `/it/...` e `/en/...`, `canonical`, `hreflang`, `sitemap.xml` e
  `robots.txt`. Il cookie resta solo come preferenza per il primo redirect. Senza questo
  passaggio la versione italiana non sarebbe indicizzabile.
- **Directory reali** di artisti e locali: ricerca, filtri, paginazione, schede con slug,
  concerti futuri, JSON-LD, link crawlable.
- **Reclamo della scheda**: l'artista dimostra la proprietà con un link pubblico e viene
  collegato subito; il locale invia una richiesta che l'admin approva o rifiuta. Una scheda
  per profilo, una richiesta in attesa alla volta, possibilità di ritirarla.
- **Verifica dello staff**: il badge "Verificato" non è decorativo, è il permesso di
  pubblicare. Il primo evento di un account nuovo può passare dalla revisione.
- **Dashboard artisti/locali** con panoramica, "I miei eventi", creazione, preferiti,
  profilo e account.
- **Editor eventi**: bozza/pubblicazione/annullamento, locandina caricata o generata,
  posizione esatta o approssimata, pin sulla mappa, prezzo libero, link biglietti,
  collegamento all'artista, avviso doppioni e tetto anti-spam di 10 serate nelle 24 ore.
- **Pagina evento completa**: locandina intera, countdown, "Aggiungi al calendario"
  (Google e `.ics`), condivisione con Share Card 1080×1920 e 1080×1080 e QR, anteprima
  Open Graph disegnata dal server. Una serata annullata lo dice e il suo `.ics` diventa
  `CANCELLED`.
- **Pagina dei preferiti** in dashboard.
- **Artisti senza account e locali senza account** possono esistere; la nota "inserito da
  OpenStage" si calcola dall'assenza di reclamo, non è più una colonna salvata.

**Decisioni e perché**

- La lingua **deve** stare nell'URL: con un cookie Googlebot riceverebbe sempre l'inglese e
  la directory italiana non esisterebbe per la ricerca.
- **Photon** per l'autocomplete degli indirizzi: nessuna chiave, nessun account; MapTiler
  avrebbe richiesto un piano commerciale.
- **"Verificato", non "Pro"**: "Pro" collide con il principio "gratis per sempre" e non
  esiste ancora un piano a pagamento.
- **Unione dei doppioni solo dall'admin**: due set nello stesso locale la stessa sera sono
  legittimi, quindi nessun blocco automatico; l'admin unisce e può disfare.
- **QR e Share Card disegnati in locale** con `qrcode` e canvas: nessun servizio esterno,
  nessun costo per immagine.

**Verifiche superate:** build e produzione verdi; prove in browser con sessioni reali;
reclamo artista e locale, coda admin, creazione e modifica eventi, `.ics`, Share Card,
QR confrontato modulo per modulo, pagina evento in italiano e inglese, mobile e desktop.

**Rimandato:** email e notifiche (Fase 7), password dimenticata (B36), conferma email
(B35), cancellazione account (B07), rifinitura grafica delle pagine pubbliche (Fase 6/13).

## Fase 4 — Qualità dei dati e moderazione

**Obiettivo:** evitare che una serata vera venga persa o che una falsa resti online per
sempre, senza punire un intero catalogo.

**Cosa è stato costruito**

- **Città normalizzata** (`city_key` generata dal database): "Milano", "milano" e
  "Milano (MI)" sono la stessa città nei filtri e nei contatori.
- **Raggio onesto**: per una serata approssimata la distanza si misura dal **bordo** della
  zona, non solo dal centro.
- **Controllo del pin**: geocodifica inversa tri-stato (`found`/`empty`/`unavailable`);
  pin sul mare rifiutato, pin lontano dalla città dichiarata avvisato o bloccato, Photon
  irraggiungibile non blocca nessuno.
- **"Come arrivare"** per cortili, centri sociali e luoghi senza indirizzo perfetto.
- **Serate collegate**: il locale può collegare una scheda artista esistente; un artista
  non può attribuirsi una serata che non è sua. Avviso doppioni con "Crea comunque".
- **Unione dei doppioni** dall'admin, reversibile, con i Preferiti spostati sulla scheda
  buona e redirect permanente dalla scheda unita.
- **Segnalazioni**: "Segnala questa serata" per chi ha un accesso, una volta per persona,
  motivi chiusi e nota. Alla terza segnalazione da persone diverse e verificate la serata
  va in pausa automaticamente.
- **Pannello `/admin/eventi`**: serate online, in pausa e segnalate; annulla, rimetti online,
  torna in bozza, sospendi o riattiva l'autore, unisci un doppione.
- **Serate passate**: sezione dedicata per artista, locale e dashboard; eliminazione
  definitiva per il proprietario e per l'admin, con conferma.

**Decisioni e perché**

- **La pausa è per serata, non per autore**: punire tutto il catalogo per una serata
  contestata sarebbe arbitrario. L'account si sospende solo a mano, davanti a un
  comportamento sistematico.
- **Nessuna recensione pubblica**: la segnalazione è uno strumento privato di moderazione,
  non un voto. Fedele al principio "niente metriche vanitose".
- **Eliminazione definitiva** solo per proprietario e admin, dopo conferma: una serata
  sbagliata non deve restare per sempre, ma non deve nemmeno sparire per un click distratto.
- **Le regole nel database**: il tetto anti-spam, il blocco delle transizioni di ruolo e la
  pausa automatica non dipendono dal form.

**Verifiche superate:** build e produzione verdi; prove con utenti Auth reali; città
deduplicate; raggio con eventi gemelli; pin sul mare e a Berlino; serata collegata e
doppione; unione e separazione; segnalazioni, pausa, rimessa online e annullamento; pulizia
delle fixture dopo i test.

**Rimandato:** notifiche email delle decisioni (Fase 7), pulsante "Unisci" provato via RPC
e non ancora cliccato in browser, sospensione autore resa visibile ma non cliccata.

## Fase 5.4 — Home poster wall

**Obiettivo:** dare alla Home un'identità editoriale e underground, senza trasformare
OpenStage in una vetrina pubblicitaria.

**Cosa è stato costruito**

- **Muro di locandine**: fino a quattro copertine reali, con ingresso sfalsato; nessuna
  immagine di repertorio, nessuna card.
- **Titolo-poster** "Stasera si suona." con Anton e IBM Plex Mono per etichette e metadati.
- **Ticker** con i valori del progetto: entra una volta e si ferma, non è un marquee.
- **Lista a righe**: data grande, titolo, artista/locale, genere, orario e ingresso.
- **Ricerca e filtri editoriali** senza pillole né glass, solo in Home; `/mappa` mantiene
  la variante precedente.
- **Mappa a tutta pagina**: fascia con intestazione, pin e link alla modalità full screen.
- **Cos'è OpenStage**: statement, tre punti e il claim "Gratis. Per sempre. Per chi suona.".
- **Come funziona** senza bento grid: tre passi, contatori reali e le due porte artista/locale.
- **Guscio coerente**: navbar, footer, language switcher e paginazione con bordi netti,
  etichette mono e CTA rettangolari.
- **Movimento sobrio**: entrata del titolo, stagger delle locandine, reveal con
  `IntersectionObserver`, hover delle righe e puntino live. Tutto CSS, tutto disattivato con
  `prefers-reduced-motion`; nessuna dipendenza nuova.

**Decisioni e perché**

- **Concept 01 "Muro di locandine"**: scelto dal proprietario; i concept alternativi sono
  superati.
- **Niente Framer Motion**: per un fade aggiungeva ~45 KB gzip; resta in Fase 13 per le
  interazioni complesse.
- **Niente card e niente glass in Home**: la Home deve sembrare una locandina appesa, non
  una dashboard.
- **La Home non ha più l'interruttore schede/tabella**: la lista è a righe; la mappa ha la
  sua pagina.
- **Nessun nuovo servizio, variabile o migration**: il lavoro è tutto di interfaccia e
  tipografia.
- **Il ticker non loopa**: un'animazione infinita sarebbe rumore, non identità.

**Verifiche superate:** build verde; nessun overflow a 320, 390 e 1280 px; italiano e
inglese; menu mobile; ricerca, filtri, mappa e paginazione; `prefers-reduced-motion`
verificato con zero animazioni; H1 unico e leggibile; produzione Vercel aggiornata con
commit `Fase 5.4`.

**Rimandato:** il resto delle pagine pubbliche (Artisti/Locali usano ancora lo stile
precedente) passa alla Fase 6; la seconda parte delle micro-interazioni alla Fase 13.

## Fase 6 — Fiducia pubblica e densità locale

**Obiettivo:** sostituire i segnaposto con pagine pubbliche vere e rendere OpenStage trovabile
città per città, senza aggiungere servizi esterni e senza toccare il modello di business.

**Cosa è stato costruito**

- **6.1 — Pagine pubbliche:** `/about`, `/per-gli-artisti`, `/per-le-venue`, `/contatti` e
  `/faq` con contenuti reali in italiano e inglese, metadata, canonical, JSON-LD e footer con
  link coerenti. Social e playlist restano nascosti finché non ci sono URL veri.
- **Modulo contatti reale:** scrive in `contact_messages` con validazione, honeypot e limiti
  di lunghezza; nessun servizio email in questa fase. La coda è in `/admin/messaggi`, con
  stati `new`, `read`, `closed` e risposta via `mailto:`.
- **6.2 — Città:** `/citta` e `/citta/[city]` generate dagli eventi reali, con prossime serate,
  artisti, locali, link alla mappa filtrata, canonical e JSON-LD. Soglia editoriale di tre
  serate future: sotto soglia la pagina resta raggiungibile ma è `noindex` e fuori dalla
  sitemap.
- **6.3 — Moderazione minima:** migration `0028_contact_messages.sql` con tabella, indici e
  RLS (inserimento pubblico, lettura e gestione solo admin); route admin senza sessione
  protetta.
- **Rifinitura post-6.3:** nuova sezione **Città** in Home (massimo sei città, ordine
  alfabetico, conteggio serate e prossima data, link a `/citta`) e pulsante **Dashboard**
  evidenziato nella navbar desktop.

**Decisioni e perché**

- **Nessun servizio nuovo:** la fase usa solo Supabase già configurato; Resend arriva con la
  Fase 7.
- **Nessun dato finto:** le città e i messaggi vengono dal database; il footer non mostra
  social o playlist senza URL reali.
- **Soglia a tre serate:** evita pagine città sottili e duplicate, senza nascondere quelle
  esistenti.
- **Home corta:** la sezione Città non deve diventare un elenco infinito; l'indice completo
  vive su `/citta`.
- **Risposta ai messaggi con `mailto:`:** sufficiente finché non esiste la casella ufficiale;
  la risposta integrata è rimandata alla Fase 7.

**Verifiche superate:** build verde; pagine pubbliche 200 in produzione; form contatti con
invio valido, honeypot ed errore; messaggio visibile all'admin e route protetta senza sessione
(404); città con zero, una e più serate; `noindex` sotto soglia; italiano e inglese; controlli
Lighthouse su Home, città e contatti.

**Rimandato:** email transazionali, conferma email e reset password (Fase 7); risposta
integrata ai messaggi (`B48`); alcune voci di audit (`B08`, `B26`, `B28`, `B43`).

## Fase 5.5A - Coerenza visiva: accesso e account

**Obiettivo:** riportare login, registrazione, account e onboarding al linguaggio della Home
5.4 senza cambiare la logica.

**Cosa è stato costruito**

- Nuovo guscio editoriale condiviso `AuthShell`: titolo-poster a sinistra, pannello sobrio a
  destra, etichette mono e valori reali del prodotto.
- Stili condivisi per input, label, pulsanti ed errori (`components/auth/formStyles.ts`).
- Restyling di `/login`, `/register`, `/account` e delle pagine di onboarding artista/locale.
- Ruolo rimosso dal form di registrazione: si sceglie **dopo** la conferma email, così il
  profilo non nasce con un ruolo scelto per errore.

**Verifiche superate:** build verde; layout a 320, 390 e 1280 px; italiano e inglese; form
reali; Turnstile presente; screenshot desktop/mobile controllati.

## Fase 7A - Email reale, conferma e recupero password

**Obiettivo:** chiudere l'accesso affidabile con dominio, Resend, SMTP Supabase e Turnstile
verificato lato server.

**Cosa è stato costruito**

- Dominio `getopenstage.it` su Aruba per la ricezione; Resend `eu-west-1` per l'invio.
- Caselle `noreply@getopenstage.it` e `ciao@getopenstage.it`; SMTP Supabase configurato.
- Conferma email obbligatoria; dopo la conferma si sceglie il ruolo.
- Link **Password dimenticata?**, pagina `/forgot-password`, pagina `/reset-password` e
  aggiornamento password con Supabase.
- CAPTCHA Supabase attivo: le richieste senza token vengono rifiutate e il server chiama
  `siteverify`. Il widget ha action `signup`, `login`, `reset_password` e si resetta dopo un
  errore.
- Callback OAuth corretto: i cookie di sessione vengono applicati alla redirect response.
- Conferma e reset cross-browser: template Supabase con `token_hash` verso `/auth/confirm`,
  così il link funziona anche se Gmail lo apre in un browser diverso.
- Dopo il login, chi non ha ancora scelto il ruolo viene mandato a `/onboarding/role`.

**Decisioni e perché**

- **Aruba riceve, Resend invia:** si tengono separati ricezione e invio transazionale.
- **Ruolo dopo la conferma:** un'email sbagliata non deve creare un profilo artista/locale.
- **Nessuna email per Google:** Google ha già verificato l'indirizzo; resta solo la scelta del
  ruolo.
- **Turnstile lato Supabase:** evita una seconda verifica e sfrutta il backend di auth già
  esistente.

**Verifiche superate:** email di conferma ricevuta; reset password funzionante; Google con
ruolo salvato; signup senza token rifiutato con `captcha_failed`; build e deploy verdi.

**Rimandato:** risposta integrata ai messaggi (`B48`) e cambio email dal profilo.

## Fase 5.5B - Scheda evento e popup mappa

**Obiettivo:** portare scheda evento e popup/bottom sheet al linguaggio editoriale, senza
nuove funzioni.

**Cosa è stato costruito**

- Scheda evento copertina-first, titolo-poster, badge mono, metadati in righe separate e
  azioni in fondo (larghezza piena su mobile).
- Popup desktop compatto con bordo `line-strong`, fondo scuro e gerarchia chiara; margine
  superiore aumentato per non finire sotto ricerca e filtri.
- Bottom sheet mobile con copertina più grande, chiusura esplicita e target ≥ 44 px.
- Gruppo locale con una serata alla volta, frecce e contatore.
- Pulsanti calendario, condivisione, salvataggio e segnalazione allineati al nuovo stile.

**Verifiche superate:** build verde; screenshot desktop/mobile della scheda evento; popup
desktop aperto su un pin reale; italiano e inglese; nessuna modifica a database o RLS.

**Rimandato:** directory artisti/locali (5.5C), guscio dashboard (5.5D) ed editor eventi
(5.5E).

## Fase 5.5C - Directory artisti e locali

**Obiettivo:** riportare `/artisti`, `/locali` e le schede al linguaggio editoriale della
Home 5.4, senza toccare filtri, query o dati.

**Cosa è stato costruito**

- Testata editoriale con etichetta mono, titolo-poster e introduzione.
- Filtri squadrati e visibili: ricerca, città, genere per gli artisti; contatore risultati
  in mono.
- Card con monogramma tipografico grande, nome leggibile e città/genere o indirizzo in
  etichetta mono; badge verificato/non reclamato discreto.
- Schede artista/locale con monogramma, nome-poster, metadati in righe `border-line`,
  claim panel sobrio ed eventi in arrivo/passati con card editoriale.
- `EventTeaser` allineato al nuovo linguaggio, riusato anche nei Preferiti.

**Verifiche superate:** build verde; screenshot desktop di `/artisti`, `/locali`,
`/artisti/[slug]` e `/locali/[slug]`; layout mobile delle directory; filtri e paginazione
invariati; italiano e inglese; nessuna modifica a database o RLS.

**Rimandato:** guscio dashboard (5.5D) ed editor eventi (5.5E).

## Fase 5.5D - Guscio dashboard e pagine esistenti

**Obiettivo:** riportare dashboard, panoramica, I miei eventi e Preferiti al linguaggio della
Home 5.4 senza cambiare le funzioni.

**Cosa è stato costruito**

- Guscio con sidebar desktop e pannello mobile squadrati, etichette mono e voce attiva
  calcolata sulla rotta **più specifica** (`/dashboard/events/new` non attiva più anche
  “I miei eventi”).
- Panoramica con etichetta mono, titolo-poster, email, KPI reali cliccabili e scorciatoie.
- “I miei eventi” con sezioni In programma, Bozze, Annullate e Passate, stato in mono,
  azioni squadrate e motivo di annullamento nello stesso linguaggio.
- “Preferiti” con card evento coerenti e stato vuoto editoriale.
- `/account` mostra un ritorno esplicito alla dashboard.

**Verifiche superate:** build verde; screenshot desktop e mobile con sessione reale;
voce attiva corretta su panoramica, I miei eventi e Crea evento; KPI e azioni invariati;
italiano e inglese; nessuna modifica a database o RLS.

**Rimandato:** editor eventi (5.5E) e le funzioni nuove della dashboard (Fase 10).

## Fase 5.5E - Editor eventi

**Obiettivo:** portare creazione e modifica evento al linguaggio editoriale, senza campi
nuovi e senza cambiare le regole di salvataggio.

**Cosa è stato costruito**

- Form a sezioni numerate, anteprima sticky su desktop e barra azioni su mobile.
- Riepilogo errori, avviso modifiche non salvate, conferma doppioni e stato reale dopo il
  salvataggio.
- Copertina, mappa, artista/locale collegato e prezzi nello stesso linguaggio della scheda
  evento.

**Verifiche superate:** build verde; creazione e modifica con dati reali; controlli di
duplicato, link biglietti e posizione; screenshot desktop/mobile.

**Rimandato:** campi avanzati (lineup, età minima, più giorni) alla Fase 12.

## Fase 7B - Email engine, notifiche e Area Fan

**Obiettivo:** completare il sistema email e dare agli utenti un centro notifiche vero,
senza trasformare OpenStage in una newsletter.

**Cosa è stato costruito**

- Tabella `notifications`, badge in navbar, centro notifiche e preferenze.
- Coda `email_queue` con worker, tetto di invio, retry, webhook Resend e registro consegne.
- Trigger per annullamenti e aggiornamenti, digest settimanale opt-in, disiscrizione senza
  login e Area Fan "Per te".
- Messaggi di contatto con risposta integrata da Resend.

**Decisioni e perché:** notifica in-app come canale principale; email solo per conferme,
risposte 1:1 e digest scelto dall'utente. Nessuna metrica di vanità.

**Verifiche superate:** coda e webhook end-to-end; conferma email e reset cross-browser;
preferenze e unsubscribe; build e deploy verdi.

**Rimandato:** push PWA e community/follow alla Fase 13.

## Fase 8.0 - Control room

**Obiettivo:** una control room unica per l'admin, separata dal sito pubblico.

**Cosa è stato costruito**

- Guscio admin con sidebar desktop, menu mobile e registro moduli.
- Panoramica "Da fare adesso", ricerca globale, KPI reali e collegamenti alle code.
- Accesso admin diretto alla control room; navbar pubblica con "Control room" al posto di
  Dashboard/Crea evento; barra mobile e player nascosti per l'admin.

**Verifiche superate:** build verde; accesso admin da password e Google; pagine admin
protette; layout desktop/mobile.

**Rimandato:** moduli persone/contenuti, 2FA e audit alle sotto-fasi successive.

## Fase 8.1 - Sicurezza, audit e revoca claim

**Obiettivo:** proteggere la control room e rendere tracciabili le azioni distruttive.

**Cosa è stato costruito**

- 2FA TOTP obbligatoria (AAL2) con pagina `/admin/sicurezza`.
- Sospensione temporanea della 2FA senza cancellare il fattore, con banner e scadenza.
- Tabella `admin_audit_log` e modulo `/admin/claim` con revoca motivata.
- La revoca azzera `profile_id` e `verified_at`, quindi la scheda torna a OpenStage.
- Sospensione/ripristino account con notifica in-app ed email transazionale.

**Verifiche superate:** redirect AAL1, enrollment TOTP, revoca in transazione, sospensione e
ripristino, audit scritto.

**Rimandato:** pannello comunicazione e automazioni AI.

## Fase 8.2 e 8.3 - Metriche, persone e contenuti

**Obiettivo:** sostituire le stime con numeri reali e dare all'admin le schede operative.

**Cosa è stato costruito**

- `admin_metrics()` con utenti, schede, eventi, preferiti, messaggi, segnalazioni, claim ed
  email.
- Pagine `/admin/utenti`, `/admin/artisti`, `/admin/locali`, `/admin/bozze`,
  `/admin/segnalazioni`, `/admin/audit` e ricerca globale.
- Sospensione utenti, chiusura/riapertura segnalazioni, verifica e rimozione verifica.
- Grafici CSS compatti nella panoramica, leggibili su telefono.

**Verifiche superate:** query reali, azioni in transazione, layout mobile, build e deploy.

**Rimandato:** filtrare le bozze personali degli autori verificati (B68); filtri, paginazione
ed export delle liste (B52).

## Fase 8.4 - Claim a invito

**Obiettivo:** invitare una persona a reclamare una scheda senza farle creare una scheda
doppia.

**Cosa è stato costruito**

- Tabella `claim_invites` con token monouso salvato solo come hash, scadenza 7 giorni e
  revoca.
- Invito dalla riga artista/locale non reclamata; email se l'account non esiste, notifica
  in-app se esiste.
- Pagina pubblica `/claim/[token]`, login/registrazione con ritorno all'invito.
- Accettazione: scheda al profilo, verifica automatica, ruolo artista/locale se l'utente era
  fan, claim approvato creato per la coda admin.

**Verifiche superate:** token monouso, accettazione con email corretta, claim visibile in
"Claim attivi", eventi pubblicabili subito dopo l'accettazione.

## Fase 8.5 - Centro assistenza

**Obiettivo:** trasformare i messaggi del form contatti in ticket gestibili.

**Cosa è stato costruito**

- Priorità, assegnazione a un admin, storico risposte e stato letto/chiuso.
- Risposta integrata: email Resend, registrazione della risposta e notifica in-app se il
  mittente ha un account.
- "Non trovi il locale? Segnalacelo" nella directory locali, con argomento già selezionato.

**Verifiche superate:** priorità e assegnazione, risposta registrata, notifica, build e
deploy.

**Rimandato:** pannello comunicazione con quota, retry e export (Fase 8.6).

## Fase 8.6 - Comunicazione email

**Obiettivo:** gestire la coda email dall'admin senza trasformarla in una newsletter.

**Cosa è stato costruito**

- Pannello `/admin/email` con coda, falliti, registro, categoria e stato.
- Quota giornaliera e mensile, riserva per le email transazionali e blocco automatico sopra
  soglia nel worker.
- Retry a lotti con anteprima dry run, selezione delle singole email e audit.
- Export CSV/JSON di coda e registro; nessun corpo email, nessun tracking.
- Batch e numero destinatari nella coda e nel registro.

**Verifiche superate:** statistiche reali, retry in transazione, export CSV, pagina admin,
build e deploy.

**Rimandato:** pannello notifiche admin aggregato (8.7) e AI assistita (8.8).

## Fase 8.6a e 8.6b - Avvisi Telegram

**Obiettivo:** avvisare l'admin sul telefono quando qualcosa richiede attenzione.

**Cosa è stato costruito**

- Primo bot per le code admin: ticket, richieste locali, claim da verificare, segnalazioni,
  bozze da revisione ed email fallite.
- Secondo bot separato per l'attività: nuove registrazioni e nuovi eventi, con totale utenti
  ed eventi.
- Token e chat in Supabase Vault; trigger che chiamano una rotta Vercel protetta; dedupe per
  non ricevere doppioni.
- Pannello `/admin/impostazioni` con stato e test per entrambi i bot.

**Verifiche superate:** route protetta, invio reale, trigger ticket, doppio canale, build e
deploy.

**Rimandato:** pannello comunicazione completo, quota Resend e export; AI assistita.

## Fase 8.8.1 - Assistente AI e bozze risposte

**Obiettivo:** introdurre l'AI come assistente dell'admin, mai come decisore.

**Cosa è stato costruito**

- Client AI su Vercel AI Gateway con modello economico `amazon/nova-lite`.
- Prompt versionati, schema Zod e registro `ai_runs` con token, costo stimato ed esito.
- Budget mensile di 5 $ e limite giornaliero configurabili.
- Pulsante **Bozza AI** nella risposta ai ticket: la bozza viene scritta nel campo, l'admin
  la modifica e decide se inviarla.
- Pannello uso AI in `/admin/impostazioni`.

**Verifiche superate:** bozza reale generata su un ticket, costo registrato, nessun invio
automatico, build e deploy.

**Rimandato:** import evento con copertina, qualità dati/doppioni, triage segnalazioni.

## Fase 8.8.2 - Import evento da testo o link

**Obiettivo:** preparare i campi di un evento partendo da un testo o una pagina pubblica.

**Cosa è stato costruito**

- Pagina `/admin/ai` con testo libero e link pubblico opzionale.
- Fetch protetto da SSRF: solo http/https, niente localhost/IP privati, redirect e timeout
  limitati, tetto di byte.
- Estrazione validata di titolo, artista, locale, città, indirizzo, data, ora, genere,
  descrizione, prezzo e link biglietti.
- Anteprima modificabile e salvataggio come bozza nell'editor eventi.

**Verifiche superate:** estrazione reale da testo, bozza creata e poi rimossa, build e deploy.

**Rimandato:** l'immagine di copertina non viene ancora importata (B75). L'import va inoltre
agganciato al flusso "crea per conto di" (B74), altrimenti la bozza resta generica dell'admin
e non entra nella coda delle prime pubblicazioni.

## Fase 8.8.3 - Verifica schede assistita

**Obiettivo:** affiancare all'admin una checklist oggettiva e un riepilogo AI, senza
automatizzare l'approvazione.

**Cosa è stato costruito**

- Controlli deterministici su email, prova HTTPS/raggiungibile, città, indirizzo, coordinate,
  sito, Spotify ed eventi esistenti.
- Punteggio indicativo e riepilogo AI con possibili incoerenze.
- Pulsante **Verifica assistita** in Claim e verifiche; l'approvazione resta manuale.
- Ogni analisi viene registrata in `ai_runs`.

**Verifiche superate:** analisi su una scheda reale, punteggio e criticità coerenti, build e
deploy.

**Rimandato:** qualità dati/doppioni (8.8.4) e triage segnalazioni (8.8.5).

## Fase 8.8.4 - Qualità dati e doppioni

**Obiettivo:** trovare i dati incompleti e i possibili doppioni senza spendere budget AI.

**Cosa è stato costruito**

- Pagina `/admin/qualita` nel gruppo Contenuti.
- Controlli su eventi (città, scheda collegata, passati ancora pubblicati, copertina, prezzo,
  date sospette), artisti e locali (campi mancanti, nessun evento, scheda libera).
- Confronto deterministico dei nomi normalizzati, con città per i locali e titolo/giorno per
  gli eventi.
- Nessuna scrittura automatica e nessuna chiamata AI: ogni riga porta alla scheda da correggere.

**Verifiche superate:** pagina IT/EN, numeri coerenti con il database, evento passato e scheda
senza eventi rilevati, doppione creato apposta e poi rimosso, build e deploy.

**Rimandato:** 8.8.5 (triage AI delle segnalazioni), solo se il volume lo giustifica.

## B74-B79 - Crea per conto di, posizione, ingresso gratuito e popup

**Obiettivo:** permettere alla redazione di pubblicare serate reali anche per artisti e locali
che non hanno ancora una scheda, senza creare doppioni.

**Cosa è stato costruito**

- `/admin/eventi/nuovo`: scelta artista/locale, import AI o inserimento manuale, copertina,
  bozza o pubblicazione.
- Scheda **libera** con `profile_id` nullo quando non ne esiste una, con conferma di nome,
  città e indirizzo e controllo doppioni.
- Geocodifica di nome/indirizzo/città: l'evento e la scheda locale nascono con il pin già
  sulla mappa.
- Onboarding artista/locale ridotto al solo nome, con atterraggio su `/account`.
- Dopo il claim dell'invito si atterra su `/account`, non sulla scheda pubblica.
- Link **Modifica** in `/admin/eventi` e `/admin/bozze`; l'admin può aprire l'editor anche
  per eventi non creati da lui.
- **Ingresso gratuito**: prezzo e link biglietti vengono scartati; pagina evento e mappa non
  mostrano il pulsante Biglietti.
- Popup mappa ancorato sopra il pin, con margine superiore e altezza massima scorrevole.

**Verifiche superate:** eventi creati con e senza scheda, doppione bloccato e collegato,
pin visibile, ricerca locale con "nome, città", modifica admin, ingresso gratuito, popup su
Home e `/mappa`, build e deploy.

## Fase 8.9 - Backup del database

**Obiettivo:** avere un backup reale e ripristinabile senza passare al piano Supabase Pro.

**Cosa è stato costruito**

- Workflow GitHub Actions `db-backup.yml`, domenica alle 03:00 UTC e avvio manuale.
- `pg_dump` in formato custom, validato con `pg_restore --list`, cifrato GPG AES-256.
- Artifact GitHub (90 giorni) + bucket Supabase privato `backups` con rotazione delle ultime
  12 copie e checksum SHA-256.
- Bucket creato con la migrazione `0051`.
- Guida ai quattro secret GitHub e procedura di ripristino in `docs/backup.md`.
- Workflow `db-restore-test.yml`: dopo ogni backup ripristina schema, dati, indici, vincoli e
  policy in un Postgres 17 temporaneo, con verifica delle righe e summary del run.

**Verifiche superate:** prima esecuzione verde il 27 ottobre 2026, dump da 233 KB, checksum
verificato; restore test automatico superato il **28 ottobre 2026**.

**Nessun blocco aperto:** il backup è periodico e il ripristino è provato a ogni copia.

## Come si aggiorna questo diario

A ogni fine fase si aggiunge una sezione con lo stesso schema: obiettivo, cosa è stato
costruito, decisioni e perché, verifiche superate, cosa è rimandato. La review di fase
(`docs/review-fase-N.md`) resta il posto dove finiscono giudizi, suggerimenti e debito
tecnico da riprendere: qui va solo ciò che è stato deciso e fatto.
