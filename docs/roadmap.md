# OpenStage — Roadmap approvata

> **Approvata dal proprietario il 19 ottobre 2026**, aggiornata lo stesso giorno con le pagine
> pubbliche, il remake grafico e le funzioni community. Fonte unica: se la tabella del manuale dice
> altro, vale questa. Il manuale (e il PDF) si aggiornano **solo su richiesta** ("aggiorna pdf").
>
> Regola ferma: ogni fase passa la build, è testabile in produzione e finisce con un commit
> "Fase N". Ogni fase apre con il parere critico e la lista dei servizi esterni in chat.

## Stato

Fasi **1 · 1.2 · 1.3 · 2 · 3** (3.0 → 3.4) **fatte e in produzione** (ultimo commit di codice
`7a6d253`). Da qui in avanti si riparte con le fasi sotto.

## Le fasi

| Fase | Contenuto | Servizi esterni / prerequisiti |
| --- | --- | --- |
| **4 — Qualità dei dati e moderazione** | 4.1 **B38** qualità della posizione (città dal pin, filtro distanza onesto, pin impossibile rifiutato, "come arrivare") · 4.2 **B39** serate collegate (locale→artista, avviso doppione, unione dall'admin) · 4.3 **B40** moderazione dopo la pubblicazione (`reports`, sospensione, visibilità ridotta solo per gli account segnalati) | **nessuno** — solo migration Supabase |
| **5 — Remake grafico e animazioni (parte 1: sistema e guscio)** | Design token definitivi, navbar e footer, **Home** (bento grid, parallax hero, scroll-reveal), card con tilt/glow, mappa, directory, schede evento/artista/locale. Arriva la libreria di animazioni (Framer Motion, prevista da `AGENTS.md` e mai installata) con regole: `prefers-reduced-motion` rispettato, nessuna animazione dietro i testi lunghi, mobile first, peso contenuto. **Parte 2 (micro-interazioni, ultimi dettagli) in Fase 13** | nessuno |
| **6 — Pagine pubbliche ed editoriali** | Le **7 pagine segnaposto** diventano vere: `/about`, `/per-gli-artisti`, `/per-le-venue`, `/contatti` (con **form reale** che scrive in database), **`/faq`** (nuova), e il footer con **playlist e social veri** (oggi sono testo). Contenuti redazionali: servono le tue parole, io impagino | nessuno (serve il tuo materiale) |
| **7 — Email Engine + Area Fan** | 7.1 Resend + SMTP di Auth + dominio + `lib/email` astratto · 7.2 `email_queue`/`email_log` + worker (`pg_cron` + Edge Function) con tetto 2 invii/sec, retry ×3 e backoff, `idempotency_key` · 7.3 webhook Resend (consegnate/rimbalzate/spam) · 7.4 template it/en · 7.5 preferenze + tetto 1/settimana + **disiscrizione senza login** · 7.6 Area Fan (Per te, Promemoria, Impostazioni) | **dominio**, account Resend. Vercel Pro **no** |
| **8 — Pannello Admin + Claim a invito** | 8.1 admin con **2FA (AAL2)** + registro azioni · 8.2 metriche · 8.3 eventi/utenti/segnalazioni · 8.4 "crea per conto di" + **`/claim/[token]`** (invito email) · 8.5 centro assistenza/ticket (agganciato al form di `/contatti`) · 8.6 registro email + riprova + export CSV/JSON | Fase 7 (email) |
| **9 — Community: segui e inviti virali** | **"Segui"** artista e locale (tabella `follows`, base per il digest della Fase 7) · **inviti virali** `/invite/CODICE` nel dashboard artista, con riscatto automatico (3 invitati con email verificata e almeno 1 evento pubblicato) | nessuno |
| **10 — Spotify e Area Artista** | Form Spotify nel profilo (brani/album/ID), **sticky player** persistente, `/playlists` con le playlist OpenStage | nessuno (embed Spotify è gratuito) |
| **11 — Monetizzazione opzionale** | 11.1 Artist Pro 3 € una tantum (PayPal Orders API + webhook con firma verificata) · 11.2 Venue Pro abbonamento (Subscriptions API, ciclo di vita, grazia 3 giorni) · 11.3 vantaggi Pro (galleria, copertina, statistiche, badge, widget) | **Vercel Pro**, dominio, conto PayPal **Business**, decisione fiscale |
| **12 — Serie, locali chiusi, bacheca ingaggi** | 12.1 ricorrenza/`serie_id` (**B41**) · 12.2 locale chiuso (**B42**) · 12.3 **`/calls`** "cercasi artisti" + candidature | nessuno nuovo |
| **13 — SEO, legal, audit e polish finale** | **B09 + B44 + B45** (OG di default, favicon, anteprime delle schede) · `/privacy`, `/terms`, `/cookies` **reali** per GDPR e pagamenti + banner cookie · **notice & takedown** · audit RLS · pagina **500** · README + checklist env · pulizia fixture · **remake parte 2** · generatore social AI (facoltativo) | Anthropic solo se si fa il generatore |

### Cancelli prima dell'apertura al pubblico

| Cancello | Perché | Dove vive |
| --- | --- | --- |
| **Dominio definitivo** (B14) | senza dominio verificato Resend e Supabase Auth non scrivono a estranei | prima della Fase 7 |
| **Conferma email + SMTP** (B35, B08) | oggi `mailer_autoconfirm = true`: si può "ereditare" l'account altrui | Fase 7, prima dei pagamenti |
| **Turnstile lato applicazione** (B11) | oggi il CAPTCHA lo verifica solo Supabase | Fase 8/13 |
| **Vercel Pro** (B16) | Hobby non è commerciale | solo con la Fase 11 |
| **Cancellazione dell'account** (B07) | diritto GDPR promesso e oggi assente | Fase 13 |
| **Backup del database** (nuovo) | il piano free di Supabase **non include backup automatici**: oggi se qualcosa si rompe non torniamo indietro | da fissare entro la Fase 8 |
| **Notice & Takedown** | conseguenza dei profili creati dall'admin | Fase 8 + Fase 13 |

## Cosa è davvero segnaposto oggi (verificato nel codice)

| Pagina | Stato |
| --- | --- |
| `/about`, `/per-gli-artisti`, `/per-le-venue`, `/contatti` | **segnaposto** (19 righe, `components/ui/PagePlaceholder.tsx`) |
| `/privacy`, `/terms`, `/cookies` | **segnaposto** — non contengono testo legale |
| `/artisti`, `/locali` + schede `[slug]` | **veri** (directory con ricerca e filtri) |
| Footer: "Playlist Spotify" e "Social" | **testo semplice**, non link |
| Animazioni | solo due componenti hanno un accenno (`Counters`, `GlobeMap`); **`framer-motion` non è installato** |

## Suggerimenti da valutare (implementazioni utili, non richieste)

Raccolta di proposte mie, con il posto in cui cadrebbero. Si decide insieme, non le costruisco di mia
iniziativa.

| # | Proposta | Dove | Perché conviene |
| --- | --- | --- | --- |
| S1 | **Pagine per città** (`/locali/milano`, `/eventi/milano`) generate dai dati reali, con JSON-LD | Fase 13 (SEO) | È la leva SEO più forte che abbiamo: "concerto a Milano stasera" è la ricerca vera. Costo basso, riusa le query esistenti |
| S2 | **Calendario personale `.ics` dei Preferiti** (`/api/me/ical`) | Fase 7 | Il codice del calendario c'è già (3.4): chi salva le serate se le porta sul telefono, e ci torna |
| S3 | **Backup settimanale** del database (script + GitHub Action, o export dal pannello) | Fase 8 | Il piano free non ha backup: è l'unico rischio che può cancellare mesi di lavoro |
| S4 | **Contatori propri in Postgres** (visite profilo, click Spotify, aggregati al giorno) invece di analytics di terze parti | Fase 10/11 | Servono alle statistiche Pro, restano privacy-friendly (nessun cookie, nessun dato personale) → **niente banner cookie per gli analytics** |
| S5 | **"Non trovi il locale? segnalalo"** (modulo breve che crea una richiesta per l'admin) | Fase 8 | Fa crescere il database dei locali con gli occhi dei fan; atterra nel centro assistenza già previsto |
| S6 | **Serate simili / "vicino a questa"** in fondo alla pagina evento | Fase 5 | Allunga la scoperta da una serata all'altra, con query già pronte |
| S7 | **Visti di recente** sulla Home | Fase 5 | Piccolo, aiuta a ritrovare ciò che si era guardato |
| S8 | **PWA installabile** con i Preferiti disponibili offline | Fase 13 | Sul telefono OpenStage diventa "un'app", senza app store |
| S9 | **Prova end-to-end automatica** (Playwright su GitHub Actions) del percorso principale | Fase 13 | Oggi ogni prova è a mano: con 13 fasi davanti, un test automatico evita le regressioni |
| S10 | **Widget incorporabile** per i locali (già nel Venue Pro) reso **libero per tutti** | Fase 11 | Un locale che incolla OpenStage sul suo sito ci porta traffico gratis: la visibilità la dà il prodotto, non il pagamento |

## Decisioni prese il 19 ottobre 2026

| # | Decisione |
| --- | --- |
| 1 | **Pro = strumenti, non visibilità.** Il Pro vende identità, strumenti e dati (galleria, copertina, statistiche, share card senza watermark, widget). **Mai** priorità comprata in ricerca, mappa, playlist o In Evidenza: sarebbe il pay-to-play vietato da `AGENTS.md`. Cosa resta libero per sempre si decide alla Fase 11 |
| 2 | **Dominio non ancora comprato**: la Fase 7 (email) lo aspetta |
| 3 | **Tempi**: nessuna fretta, orizzonte 1–2 mesi per il lancio. La qualità prima della velocità |
| 4 | **`is_unclaimed` non si reintroduce** come colonna: si ricava dall'assenza di profilo collegato |
| 5 | **`is_demo` non si crea**: la pulizia dei dati di prova resta la procedura SQL documentata a fine blocco |
| 6 | **Il remake grafico si fa in due tempi**: prima il sistema e il guscio (Fase 5), poi i dettagli (Fase 13). Così le pagine costruite dopo nascono già nel look nuovo e non si rifà due volte lo stesso lavoro |
| 7 | **Nessuna funzione di recensioni o valutazioni pubbliche** dei locali e delle serate: le valutazioni restano una raccolta interna di proposte (vedi `S1`–`S10`), non una funzione per gli utenti. Fedele a "niente metriche vanitose" |
