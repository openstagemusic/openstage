# Fase 5.5D — Guscio dashboard, panoramica, I miei eventi e Preferiti

> **Stato: completata e in produzione il 24 ottobre 2026.**
> Blocco visivo della Fase 5.5. Nessuna nuova funzione, nessuna migration,
> nessun servizio esterno. La logica esistente resta quella.

## Obiettivo

Riportare il guscio della dashboard e le pagine già esistenti al linguaggio
della Home 5.4: titolo-poster, etichette mono, bordi, righe e card sobrie.
La dashboard non deve sembrare un altro prodotto rispetto al sito pubblico.

## Cosa entra

### 5.5D.1 — Guscio

- Sidebar desktop e pannello mobile esistenti: stessa struttura, nuova pelle.
- Fondo `surface`, bordo `line`, niente glass generico; etichette mono.
- Voce attiva riconoscibile, con la **rotta più specifica** che vince:
  - `/dashboard/events/new` attiva solo “Crea evento”;
  - `/dashboard/events/[id]` attiva “I miei eventi”;
  - `/dashboard` esatta.
- Menu mobile con pulsante e pannello laterale, non un elenco in fondo.
- Link “Profilo” sistemato: `/account` resta la pagina canonica, ma dal guscio
  deve essere chiaro come tornare alla dashboard. Se serve, `/account` mostra
  un ritorno esplicito; non si duplica la pagina.

### 5.5D.2 — Panoramica

- Testata editoriale: etichetta mono, titolo-poster, email e ruolo.
- KPI reali già disponibili: bozze, pubblicati, annullati, preferiti.
- KPI cliccabili verso la lista già filtrata.
- Scorciatoie “Crea evento” e “I miei eventi” per chi può pubblicare.
- Niente gradienti decorativi, niente statistiche finte, niente card
  promozionali.

### 5.5D.3 — I miei eventi

- Sezioni: In programma, Bozze, Annullate, Passate.
- Ogni evento: titolo, data/luogo, stato, note, azioni esistenti.
- Azioni: modifica, pubblica/rimetti in programma, annulla, elimina, vedi pagina.
- L'eliminazione resta l'ultima strada e usa la conferma attuale.
- Il motivo di annullamento resta visibile e facoltativo.
- Nessun filtro o duplicazione nuovo: quelli arrivano nella Fase 10.

### 5.5D.4 — Preferiti

- Griglia di card evento coerente con la 5.5B/5.5C.
- Stato vuoto editoriale con invito a esplorare.
- Gli eventi annullati restano marcati.
- Se l'azione esiste già (`toggleSavedEvent`), aggiungere la rimozione rapida
  dalla lista. Filtri e calendario `.ics` restano nella Fase 10/7B.

### 5.5D.5 — Profilo

- `/account` è già rifatto nella 5.5A: non si rifà.
- Si sistema solo l'ingresso dal guscio e l'eventuale ritorno alla dashboard.
- Le sezioni sicurezza (7A), notifiche (7B) e cancellazione account (B07/Fase
  13) non entrano qui.

## File previsti

- `components/dashboard/DashboardShell.tsx`
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/events/page.tsx`
- `app/dashboard/saved/page.tsx`
- `components/dashboard/MyEvents.tsx`
- `app/account/page.tsx` (solo ritorno/navigazione, se serve)
- `i18n/dictionaries/it.ts`
- `i18n/dictionaries/en.ts`

Nessun altro file. Nessuna query nuova, nessuna migration, nessuna env nuova.

## QA

- [ ] Il menu desktop e mobile funziona e mostra la voce attiva giusta.
- [ ] Su `/dashboard/events/new` non risultano attive due voci.
- [ ] La panoramica mostra solo numeri reali e i KPI aprono la lista giusta.
- [ ] “I miei eventi” mostra tutte le sezioni e le azioni esistenti.
- [ ] Annullamento, ripubblicazione, eliminazione e modifica funzionano.
- [ ] “Preferiti” mostra gli eventi salvati, gli annullati e lo stato vuoto.
- [ ] La rimozione rapida, se aggiunta, usa l'azione reale.
- [ ] “Profilo” non fa perdere la navigazione della dashboard.
- [ ] Italiano e inglese; 320, 390, 768 e 1280 px.
- [ ] Focus da tastiera visibile.
- [ ] `npm run build` verde.
- [ ] Nessuna modifica a Supabase, RLS o dati.

## Criterio di chiusura

La 5.5D è chiusa quando guscio, panoramica, I miei eventi e Preferiti usano lo
stesso linguaggio della Home 5.4, tutte le funzioni esistenti sono intatte,
la build è verde e il commit è **“Fase 5.5D”**.
