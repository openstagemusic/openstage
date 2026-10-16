# Changelog del manuale

| Versione | Data | Fasi coperte | Novità |
| --- | --- | --- | --- |
| 1.0 | 16 ottobre 2026 | 1 · 1.2 · 1.3 | Prima edizione: guida utente, manuale tecnico (stack, database, sicurezza, deploy, errori noti), diario delle fasi |

## Come si aggiorna

1. Modifica o aggiungi i file `.md` in `docs/manuale/` (l'ordine dei capitoli segue il nome del
   file: `01-`, `02-`, …).
2. Aggiorna `versione` e `data` in `docs/manuale/meta.json` e aggiungi una riga a questa
   tabella.
3. Esegui `npm run manuale`: il PDF `docs/manuale/OpenStage-Manuale.pdf` viene rigenerato con
   indice e numeri di pagina aggiornati.
4. Committa i sorgenti **e** il PDF.
