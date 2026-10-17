# Fase 3 — Directory, profili, reclamo, editor eventi e condivisione

> **Stato: divisione approvata il 17 ottobre 2026.** Il prompt ricevuto unisce quattro lavori che
> nella roadmap vivevano in fasi diverse; la divisione in blocchi è confermata, le decisioni prese
> sono elencate più sotto. Stato di avanzamento: **3.0, 3.1 e 3.2 fatti**, si prosegue con 3.3.

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
  di `is_unclaimed` come "nessuno dei soggetti collegati ha reclamato".
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
  `0011` reclamo (3.2), `0012` editor/bozze/limite (3.3).

## Cosa resta fuori

- Email transazionali (Resend) e quindi notifiche email → Fase 6 (B08).
- Pagamenti, PayPal e qualsiasi "piano Pro" → Fase 8 (B16). Vercel Hobby resta non commerciale.
- Cancellazione account (B07) e rifinitura estetica (B12: è la fase finale, come deciso).

## Verifiche di fine fase

- `npm run build` verde; prova in browser reale in locale e in produzione, italiano e inglese,
  desktop e mobile; nessun errore in console.
- Ogni blocco verifica il proprio pezzo **senza** dipendere dal successivo.
- Solo dati reali: nessun evento, artista o locale finto, in nessun blocco.
