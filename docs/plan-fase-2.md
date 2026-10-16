# Fase 2 — Homepage Discovery (globo 3D, ricerca, filtri, showcase)

> Piano scritto prima di scrivere codice (regola AGENTS.md #1). Approvazione dell'utente
> richiesta prima dell'inizio: vedi parere critico e scelte di servizio in chat.

## Obiettivo

Rendere la Home una pagina di **scoperta reale**: globo 3D con i pin degli eventi futuri,
ricerca con suggerimenti raggruppati, filtri rapidi, showcase eventi (schede/tabella) e bento
grid promozionale — tutto su **dati veri** dal database, con stato vuoto curato quando non c'è
ancora nulla.

## Servizi esterni e chiavi

| Servizio | Serve? | Note |
| --- | --- | --- |
| **OpenFreeMap** (tile vettoriali) | Sì, nessun account | Nessuna chiave, nessuna registrazione, uso commerciale consentito, nessun limite dichiarato. Attribuzione obbligatoria (OpenFreeMap + OpenStreetMap) |
| **MapLibre GL JS** | Sì, libreria open source | Renderer (npm). Supporta globo e gesture cooperative dalla v5 |
| **Supabase** | Già presente | Migrazione + query reali |
| **Vercel / GitHub** | Già presenti | Geo-header IP per la centratura iniziale |
| MapTiler | Alternativa a pagamento | Piano Free = **solo non commerciale**: per un uso reale servirebbe Flex (~30 $/mese) |
| Geocoder esterni | Sconsigliati | Nominatim **vieta** l'autocomplete; Photon pubblico è fair-use |

**Variabili d'ambiente nuove: nessuna** (se si sceglie OpenFreeMap). Con MapTiler servirebbero
`NEXT_PUBLIC_MAPTILER_KEY` (pubblica, ristretta per dominio) e, solo per il geocoding lato
server, `MAPTILER_SERVER_KEY` — da impostare su Vercel in *Production, Preview, Development*.

**Identità Git**: Francesco / `ceskobeatzmusic@gmail.com` (invariata).

## Database — migrazione `0005_events_discovery.sql`

Nuove colonne su `events` (tutte additive, niente dati finti):

| Colonna | Tipo | Scopo |
| --- | --- | --- |
| `latitude`, `longitude` | double precision | Posizione del pin |
| `location_precision` | enum `exact`/`approximate` | Gli eventi approssimativi disegnano un raggio d'area |
| `area_radius_m` | integer | Raggio dell'area (solo se approssimativo) |
| `genre` | text | Genere musicale |
| `kind` | enum (`concert`,`dj_set`,`festival`,`open_mic`,`acoustic`,`other`) | Tipo evento |
| `is_free` | boolean | Ingresso gratuito |
| `ticket_url` | text | Pulsante "Biglietti" |
| `cover_image_url` | text | Locandina nel pop-up |
| `is_featured`, `featured_until` | boolean, timestamptz | Fino a 3 slot "In Evidenza" |
| `timezone` | text (default `Europe/Rome`) | Data/ora mostrata nel fuso dell'evento |

Indici: `starts_at` (solo pubblicati), `(latitude, longitude)` (solo pubblicati),
`(is_featured, starts_at)`, più `pg_trgm` + GIN su `artists.name`, `venues.name`,
`events.title`, `events.city` per i suggerimenti live. Vincolo di coerenza sulle coordinate.

Nota di comportamento già verificata: `events_select_public` mostra al pubblico **solo**
`status = 'published'` → la query pubblica filtra sempre così (e sfrutta gli indici).

## Interventi applicativi

| # | Intervento | File previsti |
| --- | --- | --- |
| 2.1 | Globo 3D (proiezione `globe`, atmosfera, pin raggruppati, area approssimativa), toggle 2D/3D, "Vicino a me", centro da geo-header IP, pop-up desktop / bottom-sheet mobile | `components/map/GlobeMap.tsx`, `components/map/EventPopup.tsx`, `lib/map/config.ts`, `app/page.tsx` |
| 2.2 | Barra di ricerca con suggerimenti live raggruppati (città, artisti, locali, eventi, generi) + filtri rapidi (stasera, weekend, settimana, 30 giorni, raggio km, genere, tipo, gratuito) — tutto in `searchParams` per condivisione e SEO | `components/discovery/*`, `app/api/suggest/route.ts`, `lib/events/queries.ts` |
| 2.3 | Showcase (schede/tabella, 12 per pagina, 3 in evidenza) + bento grid con contatori reali + stato vuoto | `components/events/*`, `components/home/BentoPromo.tsx` |
| 2.4 | Modalità "Esplora" a schermo intero (rotta `/mappa`, drag a un dito) | `app/mappa/page.tsx` |

Regole mobile (richieste): `cooperativeGestures: true` sulla Home (un dito scorre la pagina,
due dita muovono la mappa — è nativo di MapLibre, nessun codice custom); nella rotta `/mappa`
gesture libere. Caricamento della mappa **pigro** (nessun tile finché il globo non entra in
schermata o non si apre "Esplora"), zoom/pin limitati su mobile, `prefers-reduced-motion`
rispettato (niente rotazione automatica).

## Verifiche previste

1. SQL: anonimo vede solo eventi `published`; vincolo coordinate; indici presenti e usati
   (`EXPLAIN` su ricerca e filtro data).
2. Database: nessuna modifica alle policy esistenti (solo colonne e indici).
3. Browser desktop: globo, pin, pop-up con tutti i pulsanti, 2D/3D, ricerca, filtri,
   paginazione, evidenza, contatori.
4. Browser mobile: un dito scorre la pagina, due dita muovono il globo, `/mappa` a un dito,
   bottom-sheet completo.
5. Prestazioni: MapLibre fuori dal bundle iniziale (code-split + mount pigro) → LCP non
   peggiorato rispetto a oggi.
6. Stato vuoto: con 0 eventi la Home mostra l'invito a segnalare artisti/locali della zona.
7. `npm run build` verde, commit "Fase 2", deploy e verifica in produzione.

## Fuori perimetro (in backlog)

Self-hosting dei tile (PMTiles su Cloudflare R2) se il traffico cresce; geocoder globale;
notifiche; creazione/gestione eventi dall'interfaccia (Fase 3); test automatici end-to-end.
