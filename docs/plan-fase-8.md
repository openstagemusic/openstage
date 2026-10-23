# Fase 8 — Control room, claim a invito e centro assistenza

> **Stato: piano preliminare, da completare con il proprietario.** Scritto il
> 23 ottobre 2026. Non si costruisce nulla prima della 7A, della 7B e della 5.5D.
> La lista dei pannelli e delle funzioni si chiude insieme prima dell'apertura
> della fase.

## Obiettivo

Una **control room** unica per gestire OpenStage, non una pagina admin che cresce
a caso. Deve funzionare da desktop e da telefono, con moduli ordinati, azioni
tracciate e dati reali.

Riferimenti:

- `docs/design-system.md` §13 (linguaggio visivo);
- `docs/notifications-email-policy.md` (email, notifiche, quota);
- `docs/roadmap.md` (ordine e dipendenze).

## Cosa entra

### 8.0 — Guscio e registro moduli

- Guscio admin separato dal sito pubblico: niente navbar pubblica, niente player,
  niente bottom bar di scoperta. “Torna al sito”, stato 2FA, logout.
- Desktop: sidebar a gruppi. Mobile: tab raggruppati, non una fila di 15 voci.
- Una rotta per modulo (`/admin/<modulo>`); l'overview aggrega solo conteggi e
  code, non carica tutte le query.
- **Registro moduli**: chiave, nome, gruppo, icona, permesso, rotta, badge,
  descrizione, ordine. Aggiungere un pannello deve essere un'operazione
  ordinata.
- Overview “Da fare adesso”: messaggi nuovi, bozze, claim, segnalazioni, profili
  da verificare, email fallite, backup.
- KPI cliccabili che portano alla lista filtrata.
- Filtri nell'URL, paginazione server-side, export CSV/JSON, stati vuoti e di
  errore.

### 8.1 — Sicurezza

- 2FA (AAL2) obbligatoria per l'admin.
- Audit log per ogni azione che cambia dati: chi, cosa, quando, prima/dopo dove
  serve.
- Conferma esplicita per eliminare, sospendere, annullare, inviare in massa.
- Session timeout e possibilità di revocare le sessioni.
- Nessun segreto, token o errore grezzo del provider nell'interfaccia.

### 8.2 — Metriche reali

Solo numeri dal database, nessun dato finto:

- eventi pubblicati, bozze, annullati;
- artisti, locali, utenti;
- preferiti;
- messaggi e segnalazioni aperte;
- email in coda/fallite;
- quota Resend.

### 8.3 — Persone e contenuti

- Utenti: ruolo, stato, email, schede collegate, sospensione.
- Artisti e locali: verifica, claim, schede senza eventi, doppioni.
- Eventi: bozze, pubblicati, annullati, segnalati; modifica e “crea per conto di”.
- Segnalazioni: coda, stato, sospensione, visibilità ridotta.
- Città, generi e media: elenchi reali, niente contenuti inventati.

### 8.4 — Claim a invito

- `/claim/[token]` con token monouso e scadenza.
- Invito via email **solo** quando serve il token a chi non ha account; se
  l'account esiste, notifica in-app.
- L'admin vede lo stato dell'invito e può revocarlo.
- Nessun invito massivo senza dry run.

### 8.5 — Centro assistenza

- Ticket agganciati al form di `/contatti`.
- Stato, priorità, assegnazione, risposta integrata.
- Risposta 1:1 via email (transazionale); notifica in-app se l'utente ha un
  account.
- “Non trovi il locale? segnalalo” (S5) atterra qui.

### 8.6 — Comunicazione

- Registro email con `category`, `batch_id`, `recipient_count`, `status`.
- Coda, falliti, retry a lotti, dry run.
- Quota Resend usata/rimanente; riserva per `auth` e `transactional`.
- Blocco automatico sopra soglia; proposta di in-app/digest.
- Errori sanitizzati, export CSV/JSON.
- Nessun tracking, nessuna newsletter.

### 8.7 — Notifiche in-app

- Vista delle notifiche recenti, per tipo e stato.
- Conteggi di consegna/lettura (solo aggregati reali, non metriche di vanità).
- Eventuale comunicazione manuale solo con conferma e target esplicito.
- Nessun broadcast senza dry run.

## Moduli candidati (da confermare con il proprietario)

| Gruppo | Moduli |
| --- | --- |
| **Oggi** | Panoramica, cose da fare, alert |
| **Persone** | Utenti, artisti, locali, claim e verifiche, sospensioni |
| **Contenuti** | Eventi, bozze, annullati, segnalazioni, città, generi, media |
| **Community** | Messaggi contatti, ticket, segnalazioni, follow, inviti |
| **Comunicazione** | Email, coda, log, quota Resend, notifiche in-app, template |
| **Sistema** | Impostazioni, admin, audit, jobs, backup, feature flag |

Il proprietario potrà aggiungere altri pannelli e funzioni prima della fase: la
lista finale e le priorità si chiudono in una revisione dedicata.

## Ordine di lavoro

1. Chiudere la lista moduli con il proprietario.
2. 8.0 guscio + registro + overview.
3. 8.1 sicurezza, 2FA, audit.
4. 8.2 metriche, 8.3 persone/contenuti.
5. 8.4 claim a invito.
6. 8.5 centro assistenza.
7. 8.6 comunicazione, 8.7 notifiche.
8. QA, build, deploy, commit **“Fase 8”**.

## Dipendenze

- **7A**: email reale, conferma, reset, risposta contatti.
- **7B**: coda, notifiche in-app, digest, classi e quota.
- **5.5D**: guscio dashboard coerente, così l'admin non sembra un altro prodotto.
- **Backup** (S3) e **notice & takedown**: da fissare entro la fase.

## QA

- [ ] 2FA obbligatoria; senza AAL2 l'admin non entra.
- [ ] Ogni azione distruttiva chiede conferma e finisce nell'audit.
- [ ] Ogni KPI apre la lista filtrata giusta.
- [ ] Filtri e pagina restano nell'URL e funzionano al refresh.
- [ ] Tabelle leggibili a 320 px o trasformate in card.
- [ ] Email: dry run, quota, retry a lotti, errore sanitizzato.
- [ ] Notifiche: nessun dato di vanità, preferenze rispettate.
- [ ] Claim: token monouso, scadenza, revoca.
- [ ] Build verde, produzione testata, commit “Fase 8”.

## Cosa serve dal proprietario

1. La lista definitiva dei pannelli e delle funzioni che vuole sotto mano.
2. La priorità tra i moduli, se non si fa tutto in un blocco.
3. Conferma che la control room è **solo admin** (nessun accesso artista/locale).
4. Conferma delle soglie di quota e delle azioni che richiedono 2FA.
