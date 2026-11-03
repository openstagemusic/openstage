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

## Blocco 2 — richiesta di ingresso (fatto il 3 novembre 2026)

- Tabella `event_join_requests` con una sola richiesta aperta per serata/artista.
- Pulsante **«Sono in questa serata»** sulla scheda evento: compare solo a un
  artista loggato con scheda, non al creatore, non a chi è già in lineup, non su
  eventi passati o annullati. Lo stato si chiede a `/api/lineup/join`, così la
  scheda resta statica.
- Coda admin `/admin/richieste-lineup`: approva o rifiuta.
- Approvazione transazionale con `decide_event_join_request`: riga in lineup +
  notifica all'artista (se ha un account) + chiusura della richiesta.

## Blocco 3 — uscire e avvisare (fatto il 3 novembre 2026)

- **«Non posso più suonare»**: chi è in lineup e non ha creato la serata esce con
  un tocco. La riga sparisce e il gestore (e il locale, se ha un account) riceve
  una notifica. Chi ha creato la serata non esce: la serata è sua.
- **Annullamento**: quando una serata viene annullata, `notify_event_cancelled`
  avvisa **tutta la lineup**, non solo chi l'aveva salvata. Idempotente.

Resta fuori da questo blocco **«Chiedi una modifica»**: richiede una coda
dedicata e va progettato insieme alle notifiche, altrimenti diventa un doppione
delle richieste di lineup.

## Cosa non entra (blocchi successivi)

- «Chiedi una modifica» con coda dedicata.
- Statistiche dashboard per artista in lineup.
- Fusioni con unione delle lineup.

## Controllo duplicati con «Unisciti» (fatto il 3 novembre 2026)

Quando il salvataggio trova una serata simile, l'artista non ha più solo due
strade (creare comunque o annullare): accanto a ogni serata c'è **«Unisciti a
questa»**, che invia la richiesta di ingresso in lineup. La serata resta una
sola. Per un locale il pulsante non compare: non è un artista, e la serata
esistente si apre e si gestisce.

Il server rifiuta la richiesta se l'artista è già in lineup (risponde
`state: member`): il caso si presenta proprio qui, quando la serata proposta è
quella in cui suona già.

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

**Aggiornamento:** la semifinale di Nuovi Suoni all'NXT dell'8 novembre ha in
lineup **Safiye, Matteo Due e ODE** (cartellone confermato). È l'unica serata con
artisti collegati, ed è quella che si usa per verificare schede e statistiche.
