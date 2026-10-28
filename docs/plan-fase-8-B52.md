# Fase 8.10 - B52: liste admin complete

> **Stato: fatta il 28 ottobre 2026**, build verde, test admin reale, deploy e commit.
> Obiettivo: chiudere B52 per le liste principali della control room, con lo stesso
> comportamento ovunque.

## Cosa entra

- **Utenti**: ricerca, filtro ruolo, filtro stato (verificato, da verificare, sospeso),
  paginazione, export CSV/JSON.
- **Artisti e locali**: ricerca, filtro scheda reclamata/libera, filtro verifica,
  paginazione, export.
- **Eventi**: ricerca, filtro online/concluse/in pausa/segnalate/annullate, paginazione,
  export.
- **Bozze**: ricerca, paginazione, export.
- **Segnalazioni**: ricerca, filtro stato, paginazione, export.
- **Audit**: ricerca, paginazione, export.
- Filtri nell'URL (`q`, `status`, `role`, `claimed`, `verified`, `page`) così una vista
  filtrata si può condividere e ricaricare.
- Componenti condivisi: toolbar, paginazione, filtri e serializzazione export.

## Come

- Le liste restano lette dalle query esistenti, con un tetto più alto per l'admin.
- Filtri e paginazione vengono applicati **lato server** sulla pagina, prima del render.
- L'export rilegge la lista con lo stesso filtro e restituisce **tutti** i risultati, non
  solo la pagina visibile.
- Nessuna modifica allo schema: nessuna migrazione.
- Le liste già complete (email) restano come sono; ticket e claim mantengono i loro filtri
  dedicati.

## Cosa non entra

- Modifica in blocco delle righe.
- Ordinamento personalizzato per colonna.
- Export Excel nativo (CSV/JSON bastano).
- Paginazione SQL con `range`: i volumi attuali sono piccoli; quando cresceranno si sposta
  il filtro nel database senza cambiare l'interfaccia.

## QA

- [x] Ricerca e filtri cambiano l'URL e restano dopo il refresh.
- [x] La paginazione conserva i filtri.
- [x] Export CSV e JSON scaricano tutti i risultati filtrati.
- [x] Le pagine senza risultati mostrano uno stato vuoto chiaro.
- [x] Build, test admin reale, deploy e commit.
