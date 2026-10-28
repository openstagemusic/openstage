# Fase 8.11 - Notice & Takedown

> **Stato: fatta il 28 ottobre 2026**, build verde, test reale, deploy e commit.
> Obiettivo: dare a chi detiene un diritto un canale tracciabile per segnalare un
> contenuto, e all'admin una coda per decidere e documentare l'azione.

## Cosa entra

- Pagina pubblica **`/notice-takedown`** con modulo reale: tipo di segnalazione,
  dati del segnalante, URL del contenuto, descrizione, prova, dichiarazioni di
  buona fede e accuratezza.
- Tabella **`takedown_notices`** con stato `new`, `reviewing`, `actioned`,
  `rejected`, nota interna, azione eseguita, data e admin che ha deciso.
- RLS: inserimento pubblico solo con stato `new` e dichiarazioni vere; lettura e
  aggiornamento solo admin.
- Notifica **in-app** all'admin alla ricezione e **email** alla casella ufficiale;
  conferma email al segnalante e comunicazione dell'esito.
- Coda **`/admin/takedown`** con ricerca, filtri, paginazione ed export CSV/JSON
  (stesso sistema B52), pulsanti per prendere in carico, risolvere o rifiutare.
- Audit automatico in `admin_audit_log` per ogni cambio di stato.
- Voce nel footer e conteggio in "Da fare adesso".

## Cosa non entra

- Consulenza legale o decisione automatica: decide sempre una persona.
- Rimozione automatica del contenuto: l'admin apre il contenuto e usa la
  moderazione esistente, poi registra l'azione nella notice.
- Contro-notice pubblico: per ora il segnalato risponde via contatti/admin.
- Deposito legale o firma digitale.

## QA

- [x] Invio pubblico senza login, con honeypot e dichiarazioni obbligatorie.
- [x] La notice compare in `/admin/takedown` e nel conteggio "Da fare adesso".
- [x] Presa in carico, risoluzione e rifiuto aggiornano stato e audit.
- [x] Email e notifica in-app non bloccano l'operazione se falliscono.
- [x] Export CSV/JSON e accesso anonimo respinto.
- [x] Build, test reale, deploy e commit.
