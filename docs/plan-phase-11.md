# Fase 11 — Strumenti gratuiti (vendita congelata)

> **Stato: 30 ottobre 2026.** La 11A è costruita ma **dormiente**. Vendita, donazioni e
> sponsor pagati sono **congelati**: niente P.IVA, niente commercialista, nessun incasso.
> L'infrastruttura resta sui piani gratuiti. Il prossimo lavoro è **11B.1 gratuito**
> (contatti/booking e EPK). La monetizzazione diventa una **Fase 15 condizionale**.

## Perché è congelata

- Incassare senza posizione fiscale può creare obblighi di dichiarazione, contestazioni e
  blocchi dei conti.
- Donazioni e sponsor possono rendere l'uso di Vercel Hobby “commerciale”, con rischio di
  sospensione.
- Il progetto non ha ancora la domanda necessaria per un Pro. Prima serve l'uso reale.

## Principi

- **Zero incassi:** niente pass Pro, niente donazioni, niente sponsor pagati, niente ads.
- **Zero pay-to-play:** nessuna posizione, priorità, badge o algoritmo in vendita.
- **Contatti e booking gratuiti per sempre.**
- **Infrastruttura gratuita:** Vercel Hobby, Supabase Free, Resend/MapTiler/GitHub free.
  Il dominio resta l'unica spesa viva.
- **Il Pro non è pubblico.** La pagina `/dashboard/pro` va nascosta o trasformata in
  **“Strumenti” gratuiti**; niente prezzi, niente “acquista”, niente promesse.
- **Il piano base resta gratuito per sempre.**

## Cosa succede alla 11A

- Tabelle `pro_entitlements` e `pro_feature_requests` restano, ma senza pagamenti e senza
  vendita: sono una base tecnica per il futuro, non un prodotto attivo.
- Il gating Pro non deve creare un piano a pagamento: va riusato per eventuali accessi
  interni o trasformato in strumenti gratuiti.
- Il box richieste va aperto agli artisti/locali attivi **senza** Pro, oppure resta dormiente.
- Nessuna integrazione PayPal, nessun checkout, nessuna ricevuta.

## Nuova sequenza

### 11B.1 — Contatti, booking ed EPK (gratuito)

- Richiesta di booking dalla scheda: data, luogo, cachet indicativo, messaggio.
- Thread privato artista ↔ locale, notifiche in-app, email opzionale, blocca/segnala,
  anti-spam.
- EPK artista condivisibile: bio, foto, generi, link, rider, contatti, date, versione
  stampabile.
- Tutto gratuito, nessun gating.

### 11B.2 — Strumenti gratuiti

- Analytics aggregate privacy-friendly (base).
- Export CSV/JSON.
- Widget programmazione base per i locali.
- Organizzazione richieste e promemoria (base).
- Nessuna classifica, nessun conteggio pubblico nuovo.

### Fase 12 — Community e contenuti

- Serie/festival, locale chiuso, bacheca ingaggi.
- Restano gratuite.

### Fase 13 — Legali, GDPR, SEO e polish

- Privacy, Cookie, Termini reali.
- Cancellazione account.
- Audit RLS, pagina 500, SEO, accessibilità.
- Obbligatoria anche senza incassi.

### Fase 14 — Help Center

- Dopo la 13, con i ticket reali.

### Fase 15 — Sostenibilità (condizionale)

- Pass Pro, sponsor, donazioni: **solo** con posizione fiscale o ente/fiscal host che gestisce
  gli incassi.
- Condizioni da verificare con un commercialista.
- Nessuna visibilità a pagamento, nessun badge, nessun effetto sulla scoperta.

## Zero-cost: cosa tenere d'occhio

| Servizio | Uso gratuito | Rischio |
| --- | --- | --- |
| Vercel Hobby | hosting e funzioni | uso commerciale vietato: niente incassi/ads |
| Supabase Free | database, auth, storage | limiti di spazio/banda, pausa per inattività |
| Resend Free | email transazionali | quota giornaliera/mensile |
| MapTiler Free | mappe | quota richieste |
| GitHub Free | repo, Actions, backup | minuti/artifact |
| Dominio | unico costo | rinnovo annuale |

Misure: immagini compresse, storage EPK limitato, mappe lazy, notifiche in-app come default,
pulizia periodica, backup attuali.

## Quando riaprire la monetizzazione

Segnali, non date:

- 30–50 locali attivi e 100+ artisti reali;
- 500–1.000 eventi pubblicati e traffico organico stabile;
- 20–30 locali/artisti in waitlist disposti a pagare;
- richieste ripetute per gli stessi strumenti;
- costi fissi fiscalità + infrastruttura coperti da un numero realistico di clienti.

Passi: waitlist e interviste → commercialista → regime fiscale → Vercel Pro/PayPal → legali
commerciali → pass annuale. Fino ad allora: gratis.

## Cosa non entra

- Vendita, donazioni, sponsor pagati, ads.
- Pro pubblico, badge, priorità, classifiche.
- Team seats, galleria, AI e strumenti avanzati: solo dopo la Fase 15.

## QA

- [ ] Nessun pulsante/acquisto/donazione/sponsor visibile.
- [ ] Nessun prezzo o “Pro in arrivo” nelle pagine pubbliche o dashboard.
- [ ] Contatti/booking ed EPK funzionano gratuitamente.
- [ ] Vercel Hobby resta non commerciale.
- [ ] Limiti Supabase/Resend/MapTiler monitorati.
- [ ] Privacy, cookie e cancellazione account prima della spinta pubblica.
- [ ] Build, test reale, deploy e commit “Fase 11B.1”.
