# Esperimento — mappa che si apre al tocco (`?mappa=tocco`)

**Stato: attiva su telefono in `/mappa` dal 1 novembre 2026.** Sulla Home e su
computer resta la mappa immediata. Il parametro `?mappa=tocco` forza la variante
ovunque, per provarla.

## Il problema

Sulla pagina `/mappa` da telefono il punteggio Lighthouse era **66**, con il
thread principale bloccato per **3,3 secondi** all'apertura: `maplibre-gl` pesa
circa 700 kB di JavaScript e il telefono deve leggerlo e avviarlo prima di
mostrare un pin.

## La variante

Prima di caricare la mappa si vede un invito, non una mappa finta:

- quante serate sono sulla mappa;
- le prossime tre, con la data;
- un pulsante grande **«Apri la mappa interattiva»**;
- una riga: «Si carica solo ora».

MapLibre viene scaricato **solo dopo il tocco**. Nessun pin finto, nessun dato
inventato: l'anteprima mostra i dati veri che ci sono già.

## Come provarla

```bash
npm run build && npm start -- -p 3000
```

- telefono simulato: `http://localhost:3000/it/mappa?mappa=tocco`
- stessa cosa dal computer: apri lo stesso indirizzo, il parametro forza la variante
- senza parametro: tutto come prima

Il parametro funziona su Home (`/it?mappa=tocco`) e su `/mappa`.

## Misure (Lighthouse mobile, throttling standard)

| Pagina `/mappa` | Prima | Con l'invito |
| --- | --- | --- |
| Prestazioni | 66 | **88** |
| Blocco del thread (TBT) | 3.350 ms | **170 ms** |
| Tempo interattivo (TTI) | 8,7 s | **3,5 s** |
| Accessibilità | 100 | 100 |
| LCP | 2,3 s | 3,5 s |

L'LCP peggiora leggermente (il titolo grande appare dopo il testo introduttivo),
ma il telefono non si blocca più: è la differenza che si sente col dito.

Sulla Home il guadagno è nullo (76–79 con e senza): lì la mappa era già caricata
pigramente quando entrava nello schermo, e chi ci arriva la vuole vedere.

## Cosa decidere

1. **Tenerla solo su `/mappa` e solo su telefono** (consigliato): un tocco in più
   dove serve, nessun cambiamento su computer.
2. Tenerla anche sulla Home: coerente, ma aggiunge un tocco senza guadagno.
3. Non tenerla: si torna alla mappa immediata e si accetta il blocco di 3 secondi
   su telefoni lenti.

L'interruttore è `TAP_TO_LOAD_ON_MOBILE` in `components/map/GlobeMap.tsx` (ora
`true`, solo per `variant === "fullscreen"` e sotto i 768 px). Il parametro
`?mappa=tocco` resta come prova su qualunque schermo.

## Cosa tocca

| File | Cosa |
| --- | --- |
| `components/map/MapTapGate.tsx` | nuovo: l'invito con conteggio, prossime serate e pulsante |
| `components/map/GlobeMap.tsx` | interruttore (param + costante), il canvas entra solo dopo il tocco |
| `i18n/dictionaries/{it,en}.ts` | quattro stringhe `map.tap*` |
| `lib/events/editor.ts` | (extra) controllo paese/pin: pin fuori dall'Italia con paese IT → errore |
| `i18n/dictionaries/{it,en}.ts` | (extra) messaggio `countryMismatch` |
