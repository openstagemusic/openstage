# Fase 5.5B — Scheda evento e popup mappa

> **Stato: completata e in produzione il 24 ottobre 2026.**
> Blocco visivo della Fase 5.5. Nessuna nuova funzione, nessuna migration,
> nessun servizio esterno. I dati e i flussi esistenti restano identici.

## Obiettivo

Riportare la scheda pubblica dell'evento e il popup/bottom sheet della mappa
al linguaggio editoriale della Home 5.4: titolo-poster, copertina-first,
metadati in righe leggibili, azioni chiare. Niente griglie di card tutte
uguali, niente card dentro card.

## Cosa entra

### 5.5B.1 — Scheda evento

- Copertina-first quando esiste, intera e non tagliata; senza copertina resta
  la gerarchia tipografica.
- Titolo grande in `font-poster`, con artista e badge (tipo, genere, prezzo) in
  etichette mono.
- Quando, Dove, indicazioni e link utili in una lista di righe separate da
  `border-line`, non in due card glass.
- Descrizione leggibile, note su posizione approssimativa e scheda non
  rivendicata come avvisi a bordo laterale.
- Azioni principali in fondo, a larghezza piena su mobile: biglietti, salva,
  calendario, condividi, segnala.
- Una serata annullata resta leggibile: avviso prima della copertina, niente
  biglietti/calendario/salva.

### 5.5B.2 — Popup e bottom sheet

- Popup desktop compatto: una serata alla volta, bordo `line-strong`, fondo
  scuro, gerarchia chiara, target ≥ 44 px.
- Bottom sheet mobile: stessa informazione del popup, con copertina più grande
  e chiusura esplicita.
- Gruppo locale: una serata alla volta con frecce e contatore; nessuna lista
  lunga che sfonda il popup.
- Il glass è ammesso solo come sfondo del popup, mai dietro a testi lunghi.
- Nessuna duplicazione della pagina evento: il popup resta una sintesi con
  link alla scheda.

## File previsti

- `components/events/EventPageView.tsx`
- `components/events/AddToCalendar.tsx` (solo pelle)
- `components/events/ShareEventPanel.tsx` (solo pelle, se serve)
- `components/events/ReportEventButton.tsx` (solo pelle, se serve)
- `components/map/EventCard.tsx`
- `components/map/VenueEventsCard.tsx`
- `components/map/SaveEventButton.tsx` (solo pelle, se serve)
- `app/globals.css` (solo popup MapLibre)
- eventuali stringhe i18n nuove solo se indispensabili

Nessun altro file. Nessuna query nuova, nessuna migration, nessuna env nuova.

## QA

- [ ] Scheda evento con copertina, senza copertina e annullata.
- [ ] Evento con artista, locale, indirizzo, indicazioni e mappa.
- [ ] Biglietti, salva, calendario, condividi e segnala funzionano.
- [ ] Popup desktop con una serata e con locale multi-serata.
- [ ] Bottom sheet mobile, chiusura e frecce funzionanti.
- [ ] Italiano e inglese; 320, 390, 768 e 1280 px.
- [ ] Focus da tastiera visibile; target ≥ 44 px.
- [ ] `npm run build` verde.
- [ ] Nessuna modifica a Supabase, RLS o dati.

## Criterio di chiusura

La 5.5B è chiusa quando scheda evento e popup/bottom sheet usano lo stesso
linguaggio della Home 5.4, tutte le funzioni esistenti sono intatte, la build
è verde e il commit è **“Fase 5.5B”**.
