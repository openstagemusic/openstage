# Fase 14C — Multi-artista, blocco 1

Stato: **fatto il 3 novembre 2026**. Piano completo: `docs/plan-multi-artista.md`.

## Cosa entra in questo blocco

La base senza cui il resto non esiste: la lineup è una tabella, non un campo.

1. Tabella `event_artists` (`event_id`, `artist_id` o `artist_name`, `position`),
   con backfill di `events.artist_id`.
2. RLS: lettura pubblica; scrittura a chi gestisce la serata (creatore, locale
   proprietario, admin). **L'artista collegato non amministra più la serata**: era
   un errore della policy `events_update_own`.
3. Query: `EVENT_SELECT` legge la lineup; `PublicEvent.lineup` la espone; le
   serate di un artista si leggono **anche** da `event_artists`, non solo da
   `artist_id`. Vale per scheda artista, EPK e widget.
4. Scheda evento: la riga degli artisti mostra tutta la lineup, con i link alle
   schede; i nomi scritti a mano restano testo.
5. Editor: blocco **«Altri artisti in lineup»** (ricerca, aggiunta, rimozione),
   visibile a locale e admin. Salvataggio transazionale con
   `set_event_lineup(event, principale, altri)`.

## Cosa non entra (blocchi successivi)

- Richiesta di ingresso in lineup dalla scheda evento + coda admin.
- Pulsanti «Esci dalla lineup» e «Chiedi una modifica».
- Notifiche a tutta la lineup.
- Controllo «serata già esistente» nel form di creazione (esiste già
  `findSimilarEvents`: va collegato al pulsante «Unisciti»).
- Statistiche dashboard per artista in lineup.
- Fusioni con unione delle lineup.

## Come si prova

1. Aprire una serata dal pannello (`/dashboard/eventi/<id>`).
2. Nel blocco «Altri artisti in lineup», cercare un artista e aggiungerlo.
3. Salvare. Riaprire la scheda pubblica: devono comparire entrambi i nomi, con i
   link alle due schede.
4. Aprire la scheda del secondo artista: la serata deve comparire tra le
   prossime date.

## Nota sui dati

Al 3 novembre **nessun evento ha `artist_id`**: la colonna è vuota su tutte le
serate. Quindi la sezione artisti delle schede è vuota ovunque, e il backfill non
ha copiato niente. Il primo uso reale sarà quando si collega un artista a una
serata dall'editor.
