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
- **Player Spotify** fisso in basso e dock di navigazione mobile.
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

## Come si aggiorna questo diario

A ogni fine fase si aggiunge una sezione con lo stesso schema: obiettivo, cosa è stato
costruito, decisioni e perché, verifiche superate, cosa è rimandato. La review di fase
(`docs/review-fase-N.md`) resta il posto dove finiscono giudizi, suggerimenti e debito
tecnico da riprendere: qui va solo ciò che è stato deciso e fatto.
