# Fase 5.5E — Editor eventi (crea e modifica)

> **Stato: piano da approvare.** Scritto il 23 ottobre 2026.
> Blocco visivo e UX della Fase 5.5. Nessun campo nuovo, nessuna migration,
> nessun servizio esterno. L'editor continua a salvare gli stessi dati.

## Obiettivo

Riportare l'editor degli eventi al linguaggio della Home 5.4 e renderlo più
leggibile su desktop e telefono, senza cambiare il modello dati né le regole di
pubblicazione.

## Cosa entra

### 5.5E.1 — Struttura

- Sezioni numerate e riconoscibili: La serata, Quando, Dove, Ingresso,
  Copertina, Descrizione.
- Etichette mono, bordi `line`, focus ciano, niente card dentro card.
- Desktop: form a sinistra, anteprima sticky a destra.
- Mobile: form a colonna, anteprima dopo il form o in un pannello richiudibile.
- Barra azioni chiara: salva bozza, pubblica, torna agli eventi. Su mobile resta
  raggiungibile senza attraversare tutto il form.

### 5.5E.2 — Campi e feedback

- Tutti i campi attuali restano: titolo, tipo, genere, data, ora, fuso, luogo,
  mappa, artista, prezzo, biglietti, copertina, descrizione.
- Riepilogo errori in alto, errore vicino al campo, messaggi di successo con
  `role="status"`.
- Avviso “modifiche non salvate” prima di uscire, se il form è sporco.
- L'avviso doppione resta un avviso, non un blocco: “crea comunque” resta.
- L'anteprima continua a usare i dati reali del form.

### 5.5E.3 — Cosa non entra

- `ends_at`, eventi multi-giorno e serie: **B41/Fase 12**.
- Lineup, età minima, accessibilità e altri campi nuovi: **B59/Fase 12**.
- Autosalvataggio, duplicazione evento e azioni multiple: **Fase 10**.
- Nuove query, nuove migration, nuovi servizi.

## File previsti

- `components/dashboard/EventEditor.tsx`
- `components/dashboard/CoverField.tsx`
- `components/dashboard/LocationPicker.tsx`
- `components/dashboard/EventPreviewCard.tsx`
- `app/dashboard/events/new/page.tsx`
- `app/dashboard/events/[id]/page.tsx`
- `components/auth/formStyles.ts` (solo se servono classi condivise)
- `i18n/dictionaries/it.ts`
- `i18n/dictionaries/en.ts`

Nessun altro file. Nessuna migration, nessuna env nuova.

## QA

- [ ] Creazione evento: bozza, pubblicazione e doppione funzionano.
- [ ] Modifica evento: campi, mappa, copertina e anteprima funzionano.
- [ ] Il form non perde dati al refresh o al cambio di sezione.
- [ ] L'avviso modifiche non salvate compare solo quando serve.
- [ ] Gli errori sono leggibili e vicini al campo giusto.
- [ ] La barra azioni è raggiungibile su mobile.
- [ ] L'anteprima resta aggiornata mentre si scrive.
- [ ] Italiano e inglese; 320, 390, 768 e 1280 px.
- [ ] Focus da tastiera visibile.
- [ ] `npm run build` verde.
- [ ] Nessuna modifica a Supabase, RLS o dati.

## Criterio di chiusura

La 5.5E è chiusa quando crea e modifica evento usano lo stesso linguaggio della
Home 5.4, tutte le funzioni esistenti sono intatte, la build è verde e il commit
è **“Fase 5.5E”**.
