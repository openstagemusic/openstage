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

## Come si aggiorna questo diario

A ogni fine fase si aggiunge una sezione con lo stesso schema: obiettivo, cosa è stato
costruito, decisioni e perché, verifiche superate, cosa è rimandato. La review di fase
(`docs/review-fase-N.md`) resta il posto dove finiscono giudizi, suggerimenti e debito
tecnico da riprendere: qui va solo ciò che è stato deciso e fatto.
