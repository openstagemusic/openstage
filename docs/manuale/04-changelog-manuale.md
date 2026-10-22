# Changelog del manuale

| Versione | Data | Fasi coperte | Novità |
| --- | --- | --- | --- |
| 1.0 | 16 ottobre 2026 | 1 · 1.2 · 1.3 | Prima edizione: guida utente, manuale tecnico (stack, database, sicurezza, deploy, errori noti), diario delle fasi |
| 1.1 | 16 ottobre 2026 | 1 · 1.2 · 1.3 · 2 | Fase 2: mappa con globo e pin, pagine evento, ricerca con suggerimenti, filtri, salvataggio, vetrina, contatori. Nuovi capitoli tecnici "Mappe e tile", "Ricerca, filtri e stato nell'URL" e "Come si verifica una pagina". Roadmap rivista: reclamo in Fase 3, editor eventi in Fase 4. Corrette quattro indicazioni risultate imprecise: elenchi Artisti/Locali (sono segnaposto, non elenchi), protezione password compromesse (funzione del piano Pro), **player Spotify** (predisposto ma spento, non visibile) e **navigazione mobile** (a tendina dall'alto, non una barra fissa in basso) |
| 1.2 | 21 ottobre 2026 | 1 · 1.2 · 1.3 · 2 · 3 · 4 · 5.4 | Fasi 3 e 4: URL `/it`/`/en`, directory e schede pubbliche, reclamo, dashboard, editor eventi, pagina evento con calendario/condivisione, preferiti, qualità della posizione, serate collegate, segnalazioni, moderazione e serate passate. Fase 5.4: Home "muro di locandine" con Anton e IBM Plex Mono, lista a righe, mappa a tutta pagina, ticker, animazioni CSS e guscio aggiornato. Aggiornati struttura del progetto, variabili, tabelle, migrazioni, RLS, design system, roadmap e diario. Corrette le indicazioni ormai false su schede "segnaposto", creazione eventi assente, reclamo assente e preferiti senza pagina |
| 1.3 | 22 ottobre 2026 | 1 · 1.2 · 1.3 · 2 · 3 · 4 · 5.4 · 6 (6.1 → 6.3) | Fase 6: pagine pubbliche reali (`/about`, `/per-gli-artisti`, `/per-le-venue`, `/contatti`, `/faq`), indice e pagine città con soglia `noindex`, modulo contatti che scrive in database e coda messaggi admin. Aggiunte la sezione Città in Home (massimo sei città in ordine alfabetico) e l'evidenza del pulsante Dashboard. Aggiornati struttura del progetto, migration `0028`, RLS, roadmap e diario |

## Come si aggiorna

1. Modifica o aggiungi i file `.md` in `docs/manuale/` (l'ordine dei capitoli segue il nome del
   file: `01-`, `02-`, …).
2. Aggiorna `versione` e `data` in `docs/manuale/meta.json` e aggiungi una riga a questa
   tabella.
3. Esegui `npm run manuale`: il PDF `docs/manuale/OpenStage-Manuale.pdf` viene rigenerato con
   indice e numeri di pagina aggiornati.
4. Committa i sorgenti **e** il PDF.
