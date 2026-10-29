# Fase 11 — Pro operativo (solo strumenti, zero visibilità)

> **Stato: 11A fatta il 29 ottobre 2026.** Restano 11B.1 (contatti/EPK), 11B.2 (strumenti) e 11C (PayPal/legali/lancio).
> **Decisioni del proprietario:** niente beta, vendita diretta; Pro solo dentro la dashboard,
> mai in Home; EPK e booking entrano nel prodotto; **pagamento unico annuale, nessun
> abbonamento**; si vende come **persona fisica** con **PayPal Business**. Serve **una
> consulenza fiscale minima** prima di incassare.

## Principi non negoziabili

- **Zero pay-to-play:** nessuna posizione migliore in ricerca, mappa, directory, Home o
  playlist; nessun badge di visibilità; nessuna priorità algoritmica.
- **Contatto e booking gratuiti per sempre:** inviare e ricevere richieste, rispondere e
  negoziare non passano dal Pro.
- **Niente donazioni. Solo PayPal. Niente Stripe.**
- **Solo strumenti:** organizzazione, export, analytics aggregate, EPK, widget.
- **Il Pro non appare in Home, navbar, footer, schede pubbliche o sitemap.** Vive solo nella
  dashboard di artisti e locali, con pagine `noindex`.
- Il **box richieste** è ascolto, non una promessa di sviluppo né una corsia preferenziale.

## Blocchi

### 11A — Fondazioni (fatto)

- Schema `pro_subscriptions` / `pro_entitlements` con piano, stato, periodo, riferimento
  PayPal, audit e RLS. Nessun `is_pro` booleano sul profilo.
- Gating server-side nella dashboard: `trial`, `active`, `grace`, `expired`, `cancelled`.
- Area **Pro** nella dashboard, visibile solo ad artisti e locali; i fan non la vedono.
- Pagina `/dashboard/pro` con “cosa include oggi”, “cosa non comprerai mai”, stato, CTA.
- **Box “richiesta strumento”** con problema, caso d’uso, priorità; tabella dedicata, stati,
  deduplica e triage admin.
- Testi IT/EN; nessuna modifica alle pagine pubbliche.

### 11B.1 — Contatti e EPK (la parte gratuita che rende vendibile il Pro)

- **Canale contatti/booking gratuito** tra artisti e locali: richiesta con data, luogo, cachet
  indicativo e messaggio; thread privato nelle due dashboard; notifiche in-app; email
  opzionale; blocca/segnala e limite anti-spam.
- **EPK artista**: pagina condivisibile con bio, foto, generi, link, rider tecnico, contatti e
  prossime date. Versione stampabile; PDF in un secondo momento.
- La conversazione e l’invio restano gratuiti per tutti.

### 11B.2 — Strumenti Pro

- **Pipeline booking** (Pro): stati, note, promemoria, template, export. Non sblocca il contatto:
  organizza ciò che è già gratuito.
- **Analytics aggregate** privacy-friendly: visite profilo, salvataggi, follow, città/genere,
  senza cookie e senza dati personali. Solo il proprietario le vede.
- **Export dati**: CSV/JSON di eventi e programmazione per i locali; profilo e analytics per gli
  artisti.
- **Widget programmazione** per i locali: base gratuita (3 date, branding OpenStage); Pro con
  più eventi, colori, senza branding e analytics.
- Nessun conteggio pubblico nuovo, nessuna classifica.

### 11C — Pagamenti, legali e lancio

- PayPal **Orders** (una tantum), checkout, cattura, webhook firmato, idempotenza, rimborsi.
- **Nessun abbonamento e nessun rinnovo automatico**: si compra un **pass Pro di 12 mesi**.
  Alla scadenza l'accesso torna free; il rinnovo è una nuova scelta dell'utente.
- **14 giorni soddisfatti o rimborsati**, non una prova con addebito.
- Termini, Privacy, Cookie, condizioni di vendita, recesso/rimborsi.
- Fiscalità: regime, IVA, fatture/ricevute, rimborsi. **Persona fisica con PayPal Business non
  significa automaticamente “prestazione occasionale”**: serve una consulenza fiscale minima.
- Vercel Pro attivo; supporto e procedura di rimborso pronte.
- **Lancio**: vendita dal primo giorno, nessuna etichetta beta.

## Prezzi

- **Pro Artista: 49 € per 12 mesi**, pagamento unico.
- **Pro Locale: 149 € per 12 mesi**, pagamento unico.
- IVA inclusa; nessun rinnovo automatico; **14 giorni soddisfatti o rimborsati**.
- Prezzo fondatore per i primi 50: 39 € artista / 119 € locale, bloccato per il primo anno.
- Nessun piano mensile nella v1: meno complessità e meno rischio di rinnovi involontari.

## Cosa non entra

- Donazioni, Stripe, abbonamenti ricorrenti, badge Pro, priorità, limiti al contatto, Pro in Home.
- Team seats, galleria, analytics avanzate, AI: dopo il lancio, senza promesse di data.
- PDF EPK automatico nella prima versione: prima link e versione stampabile.

## Servizi esterni e ambiente

| Servizio | Ruolo | Quando |
| --- | --- | --- |
| Vercel Pro | uso commerciale e incasso | prima della 11C |
| PayPal Business | pagamento unico, webhook, ricevute/rimborsi | 11C |
| Supabase | tabelle, RLS, audit, storage foto EPK | 11A/11B.1 |
| Resend | notifiche booking e ciclo vita | 11B.1/11C |
| Commercialista | regime fiscale, IVA, fatture, rimborsi | prima della 11C |

Variabili previste: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`,
`PAYPAL_ENV` (`sandbox`/`live`). Nessun ID piano: non ci sono abbonamenti.
Git identity: `Francesco` / `ceskobeatzmusic@gmail.com`.

## Decisioni definitive

1. **Niente beta**: vendita al lancio, prodotto completo per ciò che viene venduto.
2. **Pagamento unico**: Pro Artista 49 €/12 mesi, Pro Locale 149 €/12 mesi, IVA inclusa.
   Nessun abbonamento, nessun rinnovo automatico.
3. **14 giorni soddisfatti o rimborsati**, non prova con addebito.
4. **Pro solo dashboard**: nessun riferimento in Home, navbar, footer, schede o sitemap.
5. **Contatti e booking gratuiti**; il Pro organizza, non sblocca.
6. **Primo rilascio**: fondazioni, contatti/booking, EPK, pipeline, analytics, export, widget.
7. **Dopo il lancio**: team seats, PDF EPK, galleria, strumenti richiesti.
8. **Fiscalità**: consulenza minima obbligatoria prima del primo euro; persona fisica +
   PayPal Business.

## Da definire con il commercialista

- Regime fiscale dell'attività continuativa, IVA, fatture/ricevute, rimborsi e recesso.
- Se il pass annuale è sufficiente o se serve P.IVA.

## Ordine di lavoro

1. **11A** — schema Pro, gating, dashboard, box richieste.
2. **11B.1** — contatti/booking gratuiti, EPK.
3. **11B.2** — pipeline booking Pro, analytics, export, widget.
4. **11C** — PayPal, legali, fiscalità, lancio.
5. **Dopo il lancio** — team seats, PDF EPK, galleria, strumenti richiesti.

## QA

- [ ] Un profilo free non vede gli strumenti Pro; uno Pro sì; il fan non vede nulla.
- [ ] Il Pro non compare in Home, navbar, footer, schede o sitemap.
- [ ] Inviare/ricevere richieste e rispondere funziona senza Pro.
- [ ] Pipeline, analytics ed export non cambiano ricerca, mappa o playlist.
- [ ] EPK condivisibile e stampabile; dati reali, nessun segnaposto.
- [ ] Widget base gratuito e widget Pro non alterano la scoperta.
- [ ] Webhook PayPal Orders: firma, idempotenza, retry, cattura/rimborso coerenti.
- [ ] Termini, privacy, cookie, ricevute e rimborsi prima di incassare.
- [ ] Consulenza fiscale minima fatta prima del primo euro.
- [ ] 14 giorni di prova, disdetta semplice, nessun rinnovo nascosto.
- [ ] Build, test reale, deploy e commit “Fase 11A/11B/11C”.
