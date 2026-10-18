# Fase 3.3 — Dashboard, creazione eventi, locandine, anti-spam

> **Piano approvato il 18 ottobre 2026.** L'utente ha dato il via dopo la consulenza preventiva:
> nessun servizio esterno nuovo, nessuna variabile d'ambiente nuova, migration `0015`.
> Vincolo dato dall'utente: **su mobile il menu della dashboard non deve stare in fondo alla pagina**
> — sarà un pulsante in alto che apre un pannello laterale (come la navbar pubblica, che già usa
> l'hamburger). Su desktop resta la barra laterale.

## Divisione in blocchi (uno per volta, con build e commit)

| Blocco | Cosa contiene | Migration |
| --- | --- | --- |
| **3.3.1** | Guscio della dashboard (barra laterale su desktop, hamburger + pannello su mobile), **I miei eventi** con bozze/pubblicati/annullati e le azioni *pubblica / annulla / elimina bozza*, **Preferiti**, panoramica con i numeri | nessuna |
| **3.3.2** | Editor: `/dashboard/events/new` e `/dashboard/events/[id]` con anteprima dal vivo della scheda, indirizzo con suggerimenti e mini mappa con pin trascinabile, tutti i campi | `0015` (campi mancanti: prezzo, Spotify) |
| **3.3.3** | Locandina: caricamento su Supabase Storage **e** generatore dal vivo con il canvas | `0015` (bucket + policy) |
| **3.3.4** | Limite **10 eventi per account nelle 24 ore imposto nel database**, regola bozza per i profili non verificati resa esplicita, **B33** (l'admin vede tutti i profili non verificati, non solo chi passa da un reclamo) | `0015` (trigger) |

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

## Test di fine fase (come da piano generale)

Si crea un evento reale: appare in "I miei eventi" e, se pubblicato, nella ricerca; l'11º evento
della giornata viene **rifiutato dal database**; l'account non ancora verificato resta in bozza.
