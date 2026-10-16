# Fase 3 — Profili pubblici e reclamo delle schede

## Obiettivo

Trasformare `artists` e `venues` da semplici anagrafiche (oggi `profile_id = NULL`,
righe inserite dalla redazione) in **schede pubbliche con un proprietario reale**.
Il reclamo è il pezzo che manca: senza di esso un locale o un artista non ha modo di
prendere in mano la propria pagina né, in futuro, i propri eventi.

## La decisione: due strade diverse per artista e locale

Non esiste una risposta unica buona per entrambi, perché il rischio è diverso.

**Locale → richiesta + approvazione dell'admin.**
Il locale è un luogo fisico con un nome, un indirizzo e una reputazione. Se qualcuno lo
reclama e poi pubblica eventi falsi o cambia indirizzo e sito, il danno è pubblico e
ricade su chi quel locale lo gestisce davvero. I locali sono pochi (oggi 1): la revisione
manuale costa zero e alza la qualità percepita. Coerente con *Autenticità prima dell'Hype*.

**Artista → immediato, con prova obbligatoria e revocabile.**
La ragione d'essere di OpenStage è dare visibilità agli emergenti: far aspettare un
musicista giorni per reclamare la propria scheda uccide esattamente la cosa che dobbiamo
fare, e contraddice *UX Senza Attrito* e *Gratuito per sempre*. Il rischio è più basso
(la scheda artista è identità, non un luogo) e il danno è reversibile: si chiede un link
di prova (Spotify, Bandcamp, Instagram, sito) che resta registrato, e l'admin può revocare.

**Controindicazione accettata:** un artista può "occupare" un nome che non è suo. Con la
prova registrata e la revoca dell'admin il caso è gestibile, e non vale il prezzo di
bloccare tutti gli altri.

### Regole che valgono per entrambi

- Il reclamo si fa **solo dal proprio profilo**, con ruolo coerente: `artist` per una
  scheda artista, `venue` per una scheda locale. Un fan che vuole reclamare deve prima
  scegliere il ruolo (scelta irreversibile, regola già in vigore): va detto chiaramente
  nella conferma, è il punto di attrito più delicato della fase.
- **Un profilo reclama una sola riga** (il vincolo `UNIQUE` su `profile_id` esiste già).
- Un locale che è anche musicista **non può reclamare entrambi** con lo stesso account.
- Chi ha già una propria scheda creata dall'onboarding non può reclamarne un'altra.
- Se due persone chiedono lo stesso locale, **vince la prima approvata**: le altre
  richieste pendenti su quella scheda vengono chiuse automaticamente.

### Cosa succede agli eventi collegati

- `created_by` **non si tocca**: significa "chi ha materialmente inserito la riga"
  (oggi `NULL` = redazione). Sovrascriverlo con chi reclama sarebbe falso.
- La proprietà degli eventi si ricava dal collegamento: si estendono le policy
  `events_update_own` / `events_delete_own` perché chi possiede il locale collegato
  (`venue_id`) o l'artista collegato (`artist_id`) possa gestire l'evento.
- `is_unclaimed` viene ridefinito una volta per tutte: **"nessuno dei soggetti collegati
  ha ancora reclamato la scheda"**. Diventa `false` quando il locale **o** l'artista
  collegato viene reclamato. Il testo attuale ("non ancora rivendicato dal locale") è
  già quasi giusto e va reso neutro rispetto ai due casi.

## Modello dati — migration `0009_claims.sql`

- Enum `claim_status`: `pending | approved | rejected`.
- Enum `claim_target`: `artist | venue`.
- Tabella `claims`: `profile_id`, `target`, `artist_id`, `venue_id`, `proof_url`,
  `message`, `status`, `reviewed_by`, `reviewed_at`, `created_at`, con un `CHECK` che
  impone coerenza tra `target` e la colonna valorizzata, e un indice unico parziale per
  impedire due richieste pendenti sullo stesso profilo/bersaglio.
- RLS su `claims`: il profilo vede e crea solo le proprie richieste; l'admin vede tutto.
  Nessun `UPDATE`/`DELETE` dal client: si passa solo dalle funzioni.
- Colonna `slug` su `artists` e `venues` (`UNIQUE`), con backfill deterministico
  (minuscole, accenti normalizzati con `translate`, spazi → `-`, suffisso `-2`, `-3`…
  in caso di collisione). L'estensione `unaccent` non è installata e non serve.
- Colonna `claimed_at` su `artists` e `venues`.
- Funzioni (`SECURITY DEFINER`, `search_path` fissato):
  - `claim_artist(artist_id, proof_url)` — verifica ruolo `artist`, scheda non reclamata,
    nessun'altra scheda già posseduta; assegna `profile_id`, scrive la riga in `claims`
    con stato `approved` (traccia della prova), aggiorna `is_unclaimed` sugli eventi
    collegati.
  - `request_venue_claim(venue_id, proof_url, message)` — verifica ruolo `venue`, scheda
    non reclamata, nessuna richiesta pendente; crea la richiesta `pending`.
  - `review_claim(claim_id, approve)` — riservata all'admin (`is_admin()`): approva
    assegnando `profile_id` (solo se ancora `NULL`), o rifiuta; in entrambi i casi chiude
    le altre richieste pendenti sulla stessa scheda e aggiorna `is_unclaimed`.
- Policy estese su `events` per la proprietà via `venue_id` / `artist_id`.

## Blocchi di lavoro

### 3.1 — Profili pubblici
- `/artisti/[slug]` e `/locali/[slug]`: dati reali, eventi futuri collegati, link
  (Spotify, sito, mappa), SEO e anteprime social via `getPageMetadata`.
- Le liste `/artisti` e `/locali` (oggi segnaposto) mostrano le schede reali e portano
  al profilo: sono anche il modo in cui un proprietario trova la propria scheda.
- Stato "non reclamato" visibile, con l'invito a reclamare.

### 3.2 — Reclamo
- Scheda artista non reclamata → bottone "Sono io" → conferma + link di prova → immediato.
- Scheda locale non reclamata → "Sono il gestore" → conferma + prova + messaggio → richiesta.
- Chi non ha il ruolo giusto viene guidato a sceglierlo, spiegando che è irreversibile.
- `/admin` minimale: elenco richieste in attesa, approva / rifiuta.

### 3.3 — Dopo il reclamo
- Modifica del proprio profilo: nome, città, bio, link, e per i locali indirizzo e
  coordinate sulla mappa.
- Feedback chiaro all'utente: "questa scheda è tua", stato della richiesta in attesa.

## Cosa NON entra in questa fase

- **Editor degli eventi** (creazione e modifica dall'app): è la fase successiva. Qui il
  reclamo dà la proprietà della scheda, non ancora la gestione degli eventi.
- Email transazionali (Resend): nessuna notifica via email, lo stato si legge in app
  (resta il backlog B08).
- Pagina dei preferiti (B19) e cancellazione account (B07).

## Servizi esterni, variabili e SQL

- **Nessun servizio esterno nuovo**, nessun account, nessuna chiave.
- **Nessuna variabile d'ambiente nuova** su Vercel.
- **SQL**: una sola migration, `0009_claims.sql` (enum, tabella `claims`, RLS, slug,
  funzioni, policy eventi), applicata e verificata prima del test in produzione.

## Rischi e punti aperti

| Voce | Gravità | Nota |
| --- | --- | --- |
| Artista che "occupa" un nome non suo | Bassa | Prova registrata + revoca admin |
| Fan costretto a scegliere il ruolo per reclamare | Media | Irreversibile per tua regola: va spiegato bene nella conferma |
| Un musicista che gestisce un locale non può reclamare entrambi | Media | Conseguenza della regola "un solo ruolo": da rivedere solo se diventa un caso reale |
| Nessuna notifica email sulle richieste | Bassa | L'admin vede la coda in `/admin`; l'utente vede lo stato in app |
| `slug` che cambia se cambia il nome | Bassa | Da decidere: slug stabile (consigliato) o aggiornato al rename |

## Verifiche di fine fase

- `npm run build` verde, prova in browser reale in locale e in produzione, in italiano e
  in inglese, desktop e mobile.
- Reclamo artista: immediato, con prova, `is_unclaimed` aggiornato, seconda richiesta
  bloccata, ruolo sbagliato respinto.
- Reclamo locale: richiesta in attesa, approvazione admin, `profile_id` assegnato,
  doppia richiesta chiusa, revoca possibile.
- Profili pubblici: dati reali, eventi collegati, SEO/OG, stato non reclamato.
