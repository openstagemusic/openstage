# Review Fase 2 — Homepage Discovery

Riepilogo di fase. Fase 2 è stata costruita in tre blocchi, ognuno consegnato e
verificato in produzione:

| Blocco | Contenuto | Review |
| --- | --- | --- |
| 2.1 | Globo 3D, pin raggruppati per locale, scheda evento, pagina `/mappa` a schermo intero | `docs/review-fase-2.1.md` |
| 2.2 | Ricerca con suggerimenti live, filtri rapidi, mappa sincronizzata con i filtri | `docs/review-fase-2.2.md` |
| 2.3 | Showcase Schede/Tabella, slot "In Evidenza", bento promozionale con contatori reali | `docs/review-fase-2.3.md` |

## Cosa sa fare la Home, adesso

Chi apre OpenStage vede un globo centrato sulla propria zona (dai dati di rete,
senza chiedere permessi), i concerti reali come pin raggruppati per locale, una
barra di ricerca che suggerisce città, artisti, locali, generi ed eventi pescati
dal nostro database, filtri rapidi per stasera/weekend/settimana/30 giorni,
gratuito, genere, tipo e distanza, un elenco che si può leggere a schede o in
tabella, e una bento grid che racconta come funziona e con quanti numeri veri.

Tutto quello che si vede viene dal database. Nessun dato di riempimento, nessun
evento inventato: quando non c'è niente da mostrare, la pagina lo dice e invita a
segnalare un locale o un artista.

## Le decisioni che tengono insieme la fase

- **Mappa**: MapLibre GL JS con OpenFreeMap (nessuna chiave, nessun account, uso
  commerciale consentito, attribuzione obbligatoria). L'indirizzo dei tile vive
  in un solo file.
- **Una sola fonte per lista e mappa**: ricerca, filtri e raggio si risolvono in
  una funzione SQL (`search_events`); è il motivo per cui il contatore dei pin e
  l'elenco non possono raccontare storie diverse.
- **Suggerimenti interni**: nessun geocoder esterno, così nessun suggerimento
  porta fuori da OpenStage e gli artisti emergenti non competono con i grandi
  nomi di un motore di ricerca.
- **Tutto nella URL**: ricerca, filtri, vista e pagina sono `searchParams`. Ogni
  schermata è condivisibile e renderizzata dal server (SEO e anteprime social).
- **Niente permessi non richiesti**: la posizione precisa si chiede solo con
  "Vicino a me"; per tutto il resto bastano i geo-header della rete.

## Verifiche di fase

- `npm run build` verde a ogni blocco.
- Verifica in browser reale (Chrome headless) su ogni blocco, in locale e **in
  produzione**, in italiano e in inglese: pin e pop-up, raggruppamento per
  locale, ricerca e suggerimenti, tutti i filtri, vista tabella, contatori,
  scroll, mobile 390 px, zero errori in console.
- SQL provato con i dati reali: raggio da Ranica (3 eventi) e da Roma (0),
  escaping dei jolly, suggerimenti per città/artista/locale/genere/evento.

## Rischi che restano aperti (dettaglio nei singoli blocchi)

| Voce | Gravità |
| --- | --- |
| OpenFreeMap è un'istanza gratuita finanziata da donazioni: nessuna garanzia di servizio | Media |
| Preset temporali ancorati a `Europe/Rome` (non al fuso del visitatore) | Bassa |
| Raggio centrato sulla posizione IP (livello città) | Bassa |
| "Salva" senza una pagina dei preferiti | Bassa |
| Nessun test automatico end-to-end (backlog B05) | Media |

## Cosa serve da te

- **Eventi "In Evidenza"**: la sezione è pronta e nascosta. Quando vuoi, dimmi
  quali serate mettere in vetrina (o per quanto tempo) e le marco io.
- **Dati reali**: la Home cresce con i locali e gli artisti che pubblichi. Più
  date reali ci sono, più la mappa diventa utile.
- Azioni ancora aperte dalle fasi precedenti: attivare *Leaked password
  protection* su Supabase e revocare i token di servizio usati in configurazione
  (backlog B01, B02).

## Correzioni dopo la chiusura della fase

Due segnalazioni arrivate provando la produzione, risolte e verificate in
browser reale (desktop 1440 px e mobile 390 px):

1. **Il pop-up del locale raggruppato usciva dalla mappa** e veniva tagliato,
   perché elencava tutte le serate in una scheda alta quanto il numero di date.
   Ora la scheda mostra **una serata alla volta** con le frecce `‹ 1 / 3 ›`
   sotto: altezza costante (262 px) qualunque sia il numero di date, quindi non
   esce più dal riquadro. Il margine della mappa è stato spostato dal lato
   giusto: in alto per il pop-up desktop (che sta sopra il pin), in basso per il
   bottom sheet mobile (che sta sotto), e il sheet ha un tetto di `70vh`.
2. **La pagina tornava in cima** usando ricerca e filtri. La causa era la
   versione precedente al blocco 2.3 (senza `scroll: false`): in produzione il
   salto non si riproduce più. Restavano due casi reali, sistemati: il pulsante
   "Azzera i filtri" navigava senza `scroll: false`, e i menu a tendina nativi
   su mobile possono comunque riportare in cima — ora `useScrollAnchor` annota
   la posizione prima di navigare e la ripristina **solo** se il browser ha
   davvero saltato all'inizio.
