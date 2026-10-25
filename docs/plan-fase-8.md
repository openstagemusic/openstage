# Fase 8 — Control room, claim a invito e centro assistenza

> **Stato: in corso.** Scritto il 23 ottobre 2026.
> **Fatti: 8.0 (guscio + registro + overview), 8.1 (2FA AAL2, audit, revoca
> claim), 8.2 (metriche reali), 8.3 (utenti, artisti, locali, bozze,
> segnalazioni, audit), 8.4 (claim a invito), 8.5 (ticket e messaggi),
> 8.6a (avvisi Telegram admin) e 8.6b (bot attività).** Restano il resto
> della comunicazione e l'AI assistita, più "crea per conto di".

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

**Decisioni operative (25 ottobre 2026)**

- Token casuale da 32 byte, salvato solo come hash SHA-256, scadenza 7 giorni,
  monouso; nessun token in chiaro nel database.
- L'invito si crea dalla riga della scheda artista/locale non reclamata.
- Se l'email ha già un account: notifica in-app con il link. Se non ce l'ha:
  email transazionale in coda con il link.
- Accettando l'invito la scheda passa al profilo, il profilo viene verificato
  (l'admin lo ha invitato) e, se era fan, prende il ruolo artista/locale.
- L'admin vede inviti, stato e scadenza in /admin/claim e può revocarli.
- Nessun invio massivo: un invito per scheda/email, con audit.

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

### 8.8 — Automazioni AI assistite (non autonome)

L'AI è un **assistente dell'admin**, non un decisore. Nessuna azione distruttiva,
nessuna pubblicazione, nessuna verifica e nessuna email partono senza conferma
umana. Se l'AI non risponde o sbaglia, il flusso manuale resta sempre disponibile.

**Moduli previsti**

- **8.8.1 — Bozze di risposta ai ticket/contatti.** L'AI legge il messaggio e i
  testi approvati (FAQ, termini, linee guida) e prepara una bozza. L'admin la
  modifica e la invia. Nessun invio automatico.
- **8.8.2 — Import evento da testo o link pubblico.** L'admin incolla testo/URL;
  l'AI restituisce un JSON strutturato (titolo, artista, data, ora, genere,
  indirizzo, descrizione). L'admin vede l'anteprima, corregge e salva. Niente
  scraping di pagine social autenticate; fetch con protezione SSRF e limiti.
- **8.8.3 — Verifica schede: riepilogo delle prove.** Prima si eseguono controlli
  deterministici (P.IVA/VIES, dominio, email, indirizzo, link pubblici); poi l'AI
  produce un riepilogo delle prove e delle incoerenze. Il punteggio è un'indicazione,
  non una verità: l'approvazione resta umana.
- **8.8.4 — Qualità dati e doppioni.** L'AI suggerisce campi mancanti, date o
  prezzi sospetti e possibili duplicati; l'admin decide se correggere o unire.
- **8.8.5 — Triage delle segnalazioni (facoltativo).** Classifica priorità e
  motivo, propone una coda; nessuna sospensione automatica.

**Regole di sicurezza**

- Human-in-the-loop obbligatorio per ogni scrittura.
- Input minimizzato: niente dati non necessari; P.IVA, email e messaggi solo
  quando servono al task.
- Prompt injection: il contenuto dell'utente è **dato**, non istruzione; output
  validato con Zod e schema chiuso.
- Nessun segreto o errore grezzo del provider nell'interfaccia.
- Audit di ogni esecuzione: task, modello, versione prompt, token/costo, esito,
  admin che ha approvato.
- Budget giornaliero e rate limit; fallback manuale se il provider è giù.
- Provider con retention/DPA compatibili; preferire Vercel AI Gateway con budget
  e osservabilità, oppure OpenRouter/OpenAI solo se scelti esplicitamente.

### 8.9 — Architettura AI

```text
lib/ai/
  client.ts            modello, timeout, retry, errori normalizzati
  schemas.ts           Zod input/output per ogni task
  prompts/             prompt versionati (id + versione)
  tasks/
    draft-reply.ts     bozza risposta ticket
    parse-event.ts     import evento
    verify-page.ts     riepilogo prove verifica
    audit-event.ts     qualità dati e doppioni
  limits.ts            rate limit, token cap, budget
  audit.ts             ai_runs: log e costi, senza input sensibili
  fetch-public.ts      fetch URL con protezione SSRF
```

Le Server Action/API Route ricevono input già validati, chiamano un solo task,
validano l'output e restituiscono una bozza. Nessun task scrive direttamente sul
database: la scrittura avviene dopo l'approvazione dell'admin.


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
8. **8.8 AI assistita**: partire da 8.8.1 (bozze risposta), poi 8.8.2 (import evento), poi 8.8.3/8.8.4; 8.8.5 solo se serve.
9. QA, build, deploy, commit **“Fase 8”**.

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
5. Per l'AI: provider scelto (consiglio **Vercel AI Gateway**), budget mensile,
   modello fast/smart, retention dati e conferma che ogni scrittura resta
   subordinata all'approvazione dell'admin.
