# Fase 3.3 — Dashboard, creazione eventi, locandine, anti-spam

> **Piano approvato il 18 ottobre 2026.** L'utente ha dato il via dopo la consulenza preventiva:
> nessun servizio esterno nuovo, nessuna variabile d'ambiente nuova, migration `0015`.
> Vincolo dato dall'utente: **su mobile il menu della dashboard non deve stare in fondo alla pagina**
> — sarà un pulsante in alto che apre un pannello laterale (come la navbar pubblica, che già usa
> l'hamburger). Su desktop resta la barra laterale.

## Divisione in blocchi (uno per volta, con build e commit)

| Blocco | Cosa contiene | Migration |
| --- | --- | --- |
| **3.3.1** ✅ | Guscio della dashboard (barra laterale su desktop, hamburger + pannello su mobile), **I miei eventi** con bozze/pubblicati/annullati e le azioni *pubblica / annulla / elimina bozza*, **Preferiti**, panoramica con i numeri | nessuna |
| **3.3.2** ✅ | Editor: `/dashboard/events/new` e `/dashboard/events/[id]` con anteprima dal vivo della scheda, locale collegato o scritto a mano, mini mappa con pin trascinabile, tutti i campi | `0015` (colonne `price_text` e `venue_name`), `0016` (la ricerca restituisce i nuovi campi) |
| **3.3.3** | Locandina: caricamento su Supabase Storage **e** generatore dal vivo con il canvas | `0017` (bucket + policy) |
| **3.3.4** | Limite **10 eventi per account nelle 24 ore imposto nel database**, regola bozza per i profili non verificati resa esplicita, **B33** (l'admin vede tutti i profili non verificati, non solo chi passa da un reclamo) | `0018` (trigger) |

## Decisioni prese

- **Percorsi**: `/dashboard` (panoramica), `/dashboard/events` (i miei eventi),
  `/dashboard/events/new`, `/dashboard/events/[id]` (modifica), `/dashboard/saved` (preferiti).
  `/events/new` resta come **reindirizzamento**, così i collegamenti vecchi continuano a funzionare.
- **Menu mobile**: pulsante in alto a sinistra con etichetta "Menu" che apre un pannello laterale
  (vetro, sfondo scuro): niente elenchi in fondo alla pagina.
- **Cosa vede chi**: artista, locale e admin vedono eventi, creazione e preferiti; il fan vede solo
  preferiti e profilo. Le regole del database restano l'unica autorità.
- **Pubblica**: chi non è ancora verificato **non vede** il pulsante — il database lo riporterebbe
  comunque in bozza (`events_require_review`), quindi glielo spieghiamo invece di fingere che funzioni.
- **I miei eventi** sono gli eventi con `created_by` = il profilo collegato (la RLS già limita le
  righe; il filtro esplicito evita di mescolare gli eventi pubblicati da altri, che sono leggibili
  da tutti).
- **Preferiti**: `saved_events` unita agli eventi, con la stessa scheda degli elenchi pubblici.
- **Profilo / Impostazioni**: per ora puntano a `/account` (l'unica pagina di profilo esistente).
  Una voce "Impostazioni" a sé arriva con **B36** (cambio password / email), per non mettere un
  collegamento che non porta a niente.

## 3.3.2 — scelte fatte costruendo

- **Niente geocodificatore esterno.** L'indirizzo non si digita: il locale si **cerca fra quelli già
  su OpenStage** (`/api/venues`, solo con sessione) e, se non c'è, si scrive il nome a mano
  (`events.venue_name`) e si mette il pin sulla mini mappa. Zero servizi nuovi, zero chiavi API:
  quello che si collega esiste davvero e non si paga a richiesta.
- **Il pin lo mette chi organizza.** Trascinandolo o cliccando sulla mappa; la mappa si apre sulla
  posizione del locale (o su quella di chi sta scrivendo). Verificato che il click sposta il pin e
  che le coordinate finiscono nel database.
- **Il prezzo è testo libero** (`price_text`): in un locale piccolo è "10 €", "offerta libera" o
  "8 € + tessera". Il campo compare solo se l'ingresso non è gratuito.
- **Artista e locale non si scelgono dal modulo**: l'artista della serata è chi la crea, il locale è
  quello collegato. `created_by` e `artist_id` li decide il server, così nessuno attribuisce una
  serata a un altro.
- **Le regole di validità stanno in `lib/events/editor.ts`**, fuori dal modulo: stesse regole per
  qualunque strada scriva un evento. Gli errori sono **codici** tradotti dai dizionari (il tipo
  `Record<EditorErrorCode, string>` impedisce di dimenticare una traduzione).
- **L'elenco pubblico passa da `search_events`**, che ha colonne fisse: senza la `0016` prezzo e
  nome del locale sarebbero comparsi solo aprendo la scheda dell'evento.
- La ricerca libera ora guarda anche `venue_name`: scrivere il nome di un locale senza scheda trova
  la serata.

## Test di fine fase (come da piano generale)

Si crea un evento reale: appare in "I miei eventi" e, se pubblicato, nella ricerca; l'11º evento
della giornata viene **rifiutato dal database**; l'account non ancora verificato resta in bozza.
