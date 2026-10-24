# Fase 5.5C — Directory artisti e locali

> **Stato: in corso.** Scritto il 24 ottobre 2026.
> Blocco visivo della Fase 5.5. Nessuna nuova funzione, nessuna migration,
> nessun servizio esterno. I dati e i filtri esistenti restano identici.

## Obiettivo

Riportare `/artisti`, `/locali` e le rispettive schede al linguaggio editoriale
della Home 5.4: card tipografiche, testata forte, dati reali in righe leggibili.
Niente card glass generiche e niente foto di repertorio.

## Cosa entra

### 5.5C.1 — Directory

- Testata editoriale con etichetta mono, titolo-poster e introduzione breve.
- Filtri visibili e funzionanti: ricerca, città, genere per gli artisti.
- Contatore risultati in mono.
- Griglia di card con bordo `line`, fondo `surface`, hover ciano.
- Stato vuoto sobrio, non una card glass.

### 5.5C.2 — Card artista/locale

- Senza copertina: **monogramma tipografico** grande, colore diverso per artista
  e locale; nessuna foto stock.
- Nome subito leggibile, città e genere/indirizzo in righe separate.
- Badge verificato/non reclamato discreto, non protagonista.
- Capienza del locale solo se dichiarata.

### 5.5C.3 — Schede artista/locale

- Testata forte: nome in `font-poster`, badge e metadati in mono.
- Dati reali in righe `border-line`: città, genere, indirizzo, capienza, sito,
  Spotify, mappa.
- Bio e claim panel senza card dentro card.
- Eventi in arrivo e passati con lo stesso linguaggio delle righe della Home.
- Nessun dato inventato: se un campo manca, la riga non compare.

## File previsti

- `app/artisti/page.tsx`
- `app/artisti/[slug]/page.tsx`
- `app/locali/page.tsx`
- `app/locali/[slug]/page.tsx`
- `components/directory/ArtistCard.tsx`
- `components/directory/VenueCard.tsx`
- `components/directory/DirectoryFilters.tsx`
- `components/directory/VerifiedBadge.tsx` (solo pelle)
- `components/claims/ClaimPanel.tsx` (solo pelle)
- `components/events/EventTeaser.tsx` (solo pelle, usato nelle schede)
- eventuali stringhe i18n nuove solo se indispensabili

Nessun altro file. Nessuna query nuova, nessuna migration, nessuna env nuova.

## QA

- [ ] `/artisti` e `/locali` con risultati, filtri attivi e stato vuoto.
- [ ] Paginazione e URL dei filtri invariati.
- [ ] Card artista/locale senza copertina: monogramma leggibile.
- [ ] Schede con e senza città, genere, indirizzo, capienza, sito, Spotify.
- [ ] Claim panel e pulsanti invariati.
- [ ] Eventi in arrivo/passati visibili.
- [ ] Italiano e inglese; 320, 390, 768 e 1280 px.
- [ ] Focus da tastiera visibile.
- [ ] `npm run build` verde.
- [ ] Nessuna modifica a Supabase, RLS o dati.

## Criterio di chiusura

La 5.5C è chiusa quando directory e schede usano lo stesso linguaggio della Home
5.4, filtri e dati sono intatti, la build è verde e il commit è **“Fase 5.5C”**.
