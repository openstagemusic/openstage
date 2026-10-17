# Review — Fase 3.1: fondamenta dati, schede pubbliche e directory

> Fatto il 17 ottobre 2026. Build verde, prova in browser reale su build di produzione
> (`next start`, porta 3100): **43 controlli, 0 falliti**, nessun errore in console oltre ai
> tre 404 voluti del test.

## Cosa fa questo blocco

1. **Indirizzi leggibili nel database.** `artists`, `venues` ed `events` hanno uno `slug`
   (`bobo-rondelli`, `druso`, `sick-tamburo`), generato da una funzione `public.slugify` e
   riempito per le righe già esistenti in modo deterministico (a parità di nome, il primo per
   data prende l'indirizzo pulito, gli altri `-2`, `-3`…). Un trigger impedisce che nascano righe
   nuove senza indirizzo, e risolve le collisioni da solo.
2. **Directory `/artisti` e `/locali`**: griglia di dati reali, ricerca per nome, filtro per
   città (e per genere sugli artisti), paginazione vera, conteggio reale ("3 risultati"),
   stato vuoto dedicato, `ItemList` JSON-LD. I filtri vivono nella URL: il risultato è
   condivisibile e la pagina resta renderizzata dal server.
3. **Schede `/artisti/[slug]` e `/locali/[slug]`**: dati reali, prossimi concerti presi dagli
   eventi pubblicati, link a Spotify / sito / Google Maps, `MusicGroup` e `MusicVenue` JSON-LD,
   e la dichiarazione esplicita quando la scheda **non è ancora reclamata**.
4. **Indirizzo evento canonico `/eventi/<citta>/<slug>`** con reindirizzamento permanente (301)
   da ogni altra forma (identificativo storico, città sbagliata, indirizzo più corto). Un evento,
   un indirizzo solo. `MusicEvent` JSON-LD con locale, artista, offerte e posizione.
5. **`app/sitemap.ts` e `app/robots.ts`** costruiti dal database: dentro entrambe le lingue
   (`/it/…`, `/en/…`) collegate da `alternates`; fuori accesso, registrazione, onboarding,
   creazione evento e API.
6. **Pagina 404 vera** (`app/not-found.tsx`): prima un indirizzo invecchiato mostrava l'errore
   grezzo del framework.
7. **Suggerimenti della ricerca** che portano dritto alle schede: artista → `/artisti/<slug>`,
   locale → `/locali/<slug>`, evento → indirizzo canonico. Prima l'artista e il locale erano solo
   una ricerca per nome ripetuta sulla pagina corrente.

Viste filtrate e paginate sono marcate **`noindex`** (la pagina pulita resta indicizzabile):
risolve in un colpo anche il punto "canonical delle viste paginate" che era in sospeso.

## Le due trappole vere trovate (e risolte)

**1. `slugify` disallineata.** La prima versione usava `translate(testo, accenti, lettere)`, che
sostituisce **carattere per carattere**: le due stringhe devono avere esattamente la stessa
lunghezza. Non ce l'avevano (63 contro 65) e il risultato era sbagliato in modo silenzioso:
`Città Ñoño Žlutý` diventava `citta-oyo-lutu-peri`. Trovato da una verifica di lunghezza più una
stringa di prova, non a occhio. Riscritta per **gruppi di lettere** (`regexp_replace` per lettera,
maiuscole e minuscole elencate entrambe per non dipendere dal "locale" del database): un gruppo
sbagliato ora sbaglia una lettera, non tutto il resto.

**2. Due rotte dinamiche con nomi diversi.** `app/eventi/[id]` e `app/eventi/[citta]/[slug]` non
possono convivere: Next pretende lo stesso nome per segmenti dinamici fratelli. **La build non lo
segnala**: elenca serenamente entrambe le rotte e solo all'avvio del server ogni richiesta a
`/eventi/...` finisce in errore 500. La prova in browser l'ha preso subito. Risolto con **una sola
rotta** `app/eventi/[...percorso]` che gestisce tutte le forme dell'indirizzo: è anche il punto in
cui la regola "un evento, un indirizzo" sta in tre righe.

## Scostamenti dal piano (dichiarati)

| Piano | Fatto | Perché |
| --- | --- | --- |
| `0009_directory_claims.sql` con tabella `claims` e funzioni di reclamo | **`0009`**: solo slug, `venues.capacity`, `profiles.verified_at`. Il reclamo va in 3.2 | Una migration deve arrivare **con il blocco che la usa**: funzioni di reclamo non provate fino a 3.2 sarebbero codice non verificato in produzione. `0009` è già applicata e verificata |
| `0010` prevista per l'editor eventi | **`0010_search_slugs.sql`**: le funzioni di ricerca restituiscono `slug` (e `slug`/`city` nei suggerimenti) | Senza, le pagine non potevano comporre l'indirizzo canonico. L'editor userà `0011` |
| Filtri: "solo non reclamati", capienza | Solo ricerca + città + genere | Con una riga reclamata in tutto il database (zero) un filtro "solo non reclamati" filtrerebbe tutto o niente: non è verificabile. Arriva con 3.2, quando il reclamo esiste |
| Badge "Verificato" (`profiles.verified_at`) | **Rimandato a 3.2** | Su `profiles` la RLS consente la lettura **solo al proprietario e all'admin**: un visitatore anonimo non può sapere se una scheda è verificata. Esporlo richiede una decisione (vista o funzione `SECURITY DEFINER`), e serve solo quando esiste un modo per impostarlo — cioè 3.2 |

## Prove fatte (tutte su dati reali)

| Prova | Esito |
| --- | --- |
| `/artisti` senza prefisso → `/en/artisti` (307) | OK |
| Directory: 3 artisti, "3 risultati", indirizzi `/it/artisti/<slug>` | OK |
| Filtro città dal menu → URL `?city=Livorno`, 1 scheda (senza ricaricare) | OK |
| Ricerca per nome, filtro genere, stato "nessun risultato" | OK |
| Scheda artista: titolo, eventi futuri, JSON-LD `MusicGroup`, nota "non reclamata" | OK |
| Scheda locale: titolo, 3 eventi, JSON-LD `MusicVenue` | OK |
| Evento: `canonical` corretto, JSON-LD `MusicEvent` con link a artista e locale | OK |
| Nessun link interno al vecchio `/eventi/<uuid>` nella pagina evento | OK |
| `/eventi/<uuid>` → 301 all'indirizzo canonico | OK |
| `/eventi/livorno/sick-tamburo` (città sbagliata) → 301 a Ranica | OK |
| Slug inesistente, artista inesistente, indirizzo troppo lungo → 404 vera con pagina dedicata | OK |
| Telefono 390 px: nessuno scorrimento orizzontale, filtri dentro lo schermo | OK |
| `sitemap.xml`: 200, schede reali, entrambe le lingue | OK |
| `robots.txt`: 200, indica la sitemap, esclude `/login` | OK |
| Versione inglese della directory ("Artists", "3 results") | OK |
| Vista filtrata `noindex, follow`; vista pulita senza `noindex` | OK |
| Errori in console fuori dai 404 voluti | **zero** |

## Cosa resta aperto (annotato nel backlog)

- B22: oltre 500 righe per sezione la mappa del sito va divisa (indice sitemap).
- B23: il filtro città è a valore esatto ("Ranica"), non "vicino a me": la distanza esiste già
  nella ricerca eventi, nelle directory arriverà con la rifinitura finale.
- B24: i suggerimenti propongono solo artisti e locali **con un evento in programma** (scelta
  della Fase 2): ora che le schede esistono, si può valutare di allargare a tutti.

## Rischi

- `sitemap.xml` e `robots.txt` **non** passano dal middleware (il matcher esclude i file `.xml` e
  `.txt`): se un domani il matcher cambia, vanno aggiunti lì, altrimenti finirebbero reindirizzati
  a `/it/sitemap.xml` e sparirebbero.
- Il confronto dell'indirizzo evento è **decodificato** contro `slug` ASCII: slug con caratteri
  non ASCII (oggi impossibili, li normalizza `slugify`) richiederebbero attenzione.
- `slugify` esiste in **due copie** (database per gli slug salvati, `lib/slug.ts` per comporre la
  città nell'indirizzo): sono la stessa idea scritta due volte. Se una cambia, cambia l'altra.
