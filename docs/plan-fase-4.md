# Fase 4 — Qualità dei dati e moderazione (piano)

> **Stato: roadmap approvata dal proprietario il 19 ottobre 2026.** Qui c'è la roadmap dei blocchi che
> restano (Fase 4 → Fase 10) e il piano del blocco 4, che conterrà **B38, B39, B40**. Le decisioni
> prese il 19/10 sono in fondo. **Nessuna riga di codice va scritta prima del via libera esplicito**,
> e prima di iniziare il blocco va dato in chat il parere critico e la lista dei servizi esterni
> (regola di `AGENTS.md`).

## Perché la Fase 3 si chiude e si riparte da qui

La Fase 3 (blocchi 3.0 → 3.4) è **costruita e in produzione** (commit `7a6d253`). La roadmap della
Fase 3 nel manuale era più stretta di quello che poi è stato costruito: le Fasi 4 ("editor eventi") e
5 ("preferiti") della roadmap originale **sono confluite dentro la 3.3** (editor completo, bozze,
annullamento, `/dashboard/saved`). Le fasi sono quindi state rinumerate come sotto, prendendo le voci
che il proprietario aveva preparato a parte.

## Roadmap approvata (19 ottobre 2026)

| Fase | Contenuto | Prerequisiti esterni |
| --- | --- | --- |
| **4 — Qualità dei dati e moderazione** | 4.1 **B38** qualità della posizione · 4.2 **B39** serate collegate · 4.3 **B40** moderazione dopo la pubblicazione | **nessuno** |
| **5 — Email Engine + Area Fan** | 5.1 Resend + SMTP di Auth + dominio + `lib/email` astratto · 5.2 `email_queue`/`email_log` + worker (`pg_cron` + Edge Function) con retry/backoff/idempotenza · 5.3 webhook Resend (delivered/bounced/complained) · 5.4 template (React Email) it/en · 5.5 preferenze + tetto 1/settimana + disiscrizione · 5.6 Area Fan (Per te, Promemoria, Impostazioni) | **dominio**, account Resend; Vercel Pro **no** |
| **6 — Pannello Admin + Claim a invito** | 6.1 admin con 2FA (AAL2) + registro azioni · 6.2 metriche · 6.3 eventi/utenti/segnalazioni · 6.4 "crea per conto di" + `/claim/[token]` · 6.5 centro assistenza/ticket (il form pubblico in `/contatti` va creato) · 6.6 registro email + riprova + export CSV/JSON | Fase 5 (email) |
| **7 — Spotify, Area Artista, inviti virali** | form Spotify nel profilo · sticky player · `/playlists` · referral `/invite/CODICE` | tabella `follows`/`invites` |
| **8 — Monetizzazione opzionale** | 8.1 Artist Pro 3 € una tantum (Orders API) · 8.2 Venue Pro abbonamento (Subscriptions API) · 8.3 vantaggi Pro | **Vercel Pro**, dominio, conto PayPal Business, decisione fiscale |
| **9 — Serie, locali chiusi, bacheca ingaggi** | 9.1 ricorrenza/serie (**B41**) · 9.2 locale chiuso (**B42**) · 9.3 `/calls` + candidature | nessuno nuovo |
| **10 — SEO, legal, audit, polish finale** | **B09** + **B44** + **B45** · privacy/terms/cookie finali + banner cookie · notice & takedown · audit RLS · pagina 500 · README + checklist env · pulizia fixture · generatore social AI (facoltativo) | Anthropic, solo se si fa il generatore |

### Cancelli prima dell'apertura al pubblico

| Cancello | Perché | Dove vive |
| --- | --- | --- |
| Dominio definitivo (**B14**) | senza dominio verificato Resend e Supabase Auth non possono scrivere a estranei | prima della Fase 5 |
| Conferma email + SMTP (**B35**, B08) | oggi `mailer_autoconfirm = true`: si può "ereditare" l'account altrui | Fase 5, prima dei pagamenti |
| Turnstile lato applicazione (**B11**) | oggi il CAPTCHA lo verifica solo Supabase | Fase 9/10 |
| Vercel Pro (**B16**) | Hobby non è commerciale | solo con la Fase 8 |
| Cancellazione dell'account (**B07**) | diritto GDPR promesso e oggi assente | Fase 10 |
| Notice & Takedown | conseguenza dei profili creati dall'admin | Fase 6 + Fase 10 |

## Piano del blocco 4 (tre lavori, in quest'ordine)

### 4.1 — B38 · Qualità della posizione

Oggi `search_events` usa **solo il centro del pin**: un evento "±3 km" il cui centro è appena fuori dal
raggio richiesto non compare, anche se la zona comprende chi cerca. La città è **testo libero** e le
liste dei filtri nascono dai valori distinti ("milano" e "Milano" = due città). Manca un controllo che
il pin cada su un posto reale.

- Città **derivata dal pin** con chiave normalizzata (riuso della geocodifica inversa già presente,
  con la cache `geocode_cache`).
- Filtro di distanza **onesto** per gli eventi approssimativi: chi cerca dentro il raggio deve vedere
  gli eventi la cui **zona** lo comprende, non solo quelli il cui centro è dentro.
- **Confronto con la città dichiarata**: avviso oltre ~50 km, rifiuto oltre ~300 km.
- Pin **impossibile rifiutato**: la geocodifica inversa non restituisce nulla (mare aperto) → segnale
  per bloccare l'inserimento.
- Campo breve **"come arrivare"** per centri sociali, loft, cortili, spiagge (spazi temporanei),
  mostrato nella pagina evento.

### 4.2 — B39 · Serate collegate

Oggi `artist_id` lo decide il server = la scheda di **chi crea**: un evento inserito da un locale ha
`artist_id` nullo e **non comparirà mai** sulla pagina dell'artista. Quando l'artista si registra e
crea la stessa serata nascono due righe.

- Il modulo del **locale** collega una scheda artista esistente.
- **Rilevamento all'ingresso** con avviso ("esiste già questa serata: [Vedi] [Crea comunque]"), mai
  blocco: due set la stessa sera nello stesso locale sono legittimi (decisione 2, congelata).
- **Unione** solo come gesto dell'**admin**: `merged_into`, reversibile, con la pagina che rimanda e i
  Preferiti spostati (decisione 3, congelata).

### 4.3 — B40 · Moderazione dopo la pubblicazione

L'admin ha già i permessi in RLS su tutti gli eventi ma **non l'interfaccia**: oggi vede solo bozze e
reclami, quindi un account **verificato** che pubblica serate false non passa da nessuna coda. Il
database è pronto per la sospensione (`profiles.suspended_at`, dalla 3.3.4), manca il pulsante.

- Pannello degli eventi **pubblicati** (filtri, sospensione, annullamento).
- **"Segnala"** pubblico (tabella `reports` nuova).
- Visibilità ridotta **solo** per gli account segnalati (es. max 2 serate in Home), **mai** per tutti:
  sarebbe una punizione arbitraria per chi pubblica un weekend intero.
- Collegato a **B26** (rifiutare una bozza con un motivo) — che però richiede le email: si chiude in
  Fase 5.

**Punto aperto da decidere prima di costruire**: l'auto-nascondimento a 3 segnalazioni. Tre account
possono nascondere un evento sano. Proposta: 3 segnalazioni **da utenti diversi e verificati** →
l'evento viene segnato per revisione e sospeso **temporaneamente**, con notifica all'artista e
decisione finale dell'admin.

## Servizi esterni e variabili per la Fase 4

**Nessuno nuovo.** Niente Resend, niente PayPal, niente chiavi. Solo migration Supabase (città
normalizzata e "come arrivare" per B38, `merged_into` per B39, `reports` per B40) e prove in
produzione come per le fasi precedenti.

## Decisioni prese il 19 ottobre 2026 (valide per le fasi successive)

| # | Decisione |
| --- | --- |
| 1 | **Pro = strumenti, non visibilità.** L'Artist Pro e il Venue Pro vendono identità, strumenti e dati (galleria, copertina, statistiche, share card senza watermark, widget). **Mai** priorità comprata in ricerca, mappa, playlist o In Evidenza: sarebbe il pay-to-play vietato da `AGENTS.md`. Cosa resta libero per sempre e cosa entra nel Pro si deciderà alla Fase 8 |
| 2 | **Dominio non ancora comprato**: la Fase 5 (email) aspetta lui, quindi la Fase 4 va per prima (non richiede servizi esterni) |
| 3 | **Tempi**: nessuna fretta, orizzonte di 1–2 mesi per il lancio ufficiale. La qualità viene prima della velocità |
| 4 | **`is_unclaimed` non si reintroduce** come colonna: lo stato "non reclamato" si ricava dall'assenza di profilo collegato (scelta della 3.2.2) |
| 5 | **`is_demo` non si crea**: la pulizia dei dati di prova resta la procedura SQL documentata a fine blocco (politica Zero Dati Finti) |
| 6 | **Manuale e PDF**: si aggiornano solo su richiesta esplicita ("aggiorna pdf"). La roadmap qui sopra è quindi la fonte aggiornata; la tabella nel manuale è ancora quella vecchia |
