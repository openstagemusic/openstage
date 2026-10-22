# OpenStage — Roadmap approvata

> **Approvata dal proprietario il 19 ottobre 2026**, aggiornata lo stesso giorno con le pagine
> pubbliche, il remake grafico e le funzioni community. **Ultimo aggiornamento: 22 ottobre 2026,
> dopo la chiusura delle Fasi 4, 5 e 6.** Fonte unica: se la tabella del manuale dice altro, vale
> questa. Il manuale (e il PDF) si aggiornano **solo su richiesta** ("aggiorna pdf").
>
> **Design e movimento**: `docs/design-system.md` (approvato il 21 ottobre 2026) è il
> riferimento per colori, tipografia, spazi, glass, animazioni, mobile e accessibilità.
>
> Regola ferma: ogni fase passa la build, è testabile in produzione e finisce con un commit
> "Fase N". Ogni fase apre con il parere critico e la lista dei servizi esterni in chat.

## Stato

Fasi **1 · 1.2 · 1.3 · 2 · 3 · 4 · 5 · 6** (6.1 → 6.3) **fatte e in produzione** (ultimo
commit di codice `b5cdbd4`, 22 ottobre 2026). Da qui si riparte dalla **Fase 7**, bloccata dal
dominio definitivo (B14); la Fase 8 dipende dalla 7. La Fase 6.3 ha aggiunto la coda messaggi
in `/admin/messaggi`.

## Le fasi

| Fase | Contenuto | Servizi esterni / prerequisiti |
| --- | --- | --- |
| **✅ 4 — Qualità dei dati e moderazione** | 4.1 **B38** qualità della posizione (città dal pin, filtro distanza onesto, pin impossibile rifiutato, "come arrivare") · 4.2 **B39** serate collegate (locale→artista, avviso doppione, unione dall'admin) · 4.3 **B40** moderazione dopo la pubblicazione (`reports`, sospensione, visibilità ridotta solo per gli account segnalati) | **nessuno** — solo migration Supabase |
| **✅ 5 — Remake grafico e animazioni (parte 1: sistema e guscio)** | Design token definitivi, navbar e footer, **Home** (bento grid, hero animato, scroll-reveal), card con glow, mappa, directory, schede evento/artista/locale. **Decisione del 22 ottobre 2026: niente Framer Motion**; animazioni CSS + `IntersectionObserver`, `prefers-reduced-motion` rispettato, nessuna animazione dietro i testi lunghi, mobile first. **Tilt 3D e parallax restano B12**; parte 2 in Fase 13 | nessuno |
| **✅ 6 — Pagine pubbliche ed editoriali** | Fatte: `/about`, `/per-gli-artisti`, `/per-le-venue`, `/contatti` (con **form reale** che scrive in database), **`/faq`**, **`/citta`** e **`/citta/[city]`**; footer con link reali e social/playlist **nascosti** se mancano URL. La 6.3 ha aggiunto la coda messaggi in `/admin/messaggi`. Contenuti redazionali in italiano e inglese | nessuno (materiale del proprietario) |
| **7 — Email Engine + Area Fan** | 7.1 Resend + SMTP di Auth + dominio + `lib/email` astratto · 7.2 `email_queue`/`email_log` + worker (`pg_cron` + Edge Function) con tetto 2 invii/sec, retry ×3 e backoff, `idempotency_key` · 7.3 webhook Resend (consegnate/rimbalzate/spam) · 7.4 template it/en · 7.5 preferenze + tetto 1/settimana + **disiscrizione senza login** · 7.6 Area Fan (Per te, Promemoria, Impostazioni) · include **B08, B26, B28, B43, B48**; **B35** conferma email e **B36** reset password | **dominio**, account Resend. Vercel Pro **no** |
| **8 — Pannello Admin + Claim a invito** | 8.1 admin con **2FA (AAL2)** + registro azioni · 8.2 metriche · 8.3 eventi/utenti/segnalazioni · 8.4 "crea per conto di" + **`/claim/[token]`** (invito email) · 8.5 centro assistenza/ticket (agganciato al form di `/contatti`) · 8.6 registro email + riprova + export CSV/JSON | Fase 7 (email) |
| **9 — Community: segui e inviti virali** | **"Segui"** artista e locale (tabella `follows`, base per il digest della Fase 7) · **inviti virali** `/invite/CODICE` nel dashboard artista, con riscatto automatico (3 invitati con email verificata e almeno 1 evento pubblicato) | nessuno |
| **10 — Spotify e Area Artista** | Form Spotify nel profilo (brani/album/ID), **sticky player** persistente, `/playlists` con le playlist OpenStage | nessuno (embed Spotify è gratuito) |
| **11 — Monetizzazione opzionale** | 11.1 Artist Pro 3 € una tantum (PayPal Orders API + webhook con firma verificata) · 11.2 Venue Pro abbonamento (Subscriptions API, ciclo di vita, grazia 3 giorni) · 11.3 vantaggi Pro (galleria, copertina, statistiche, badge, widget) | **Vercel Pro**, dominio, conto PayPal **Business**, decisione fiscale |
| **12 — Serie, locali chiusi, bacheca ingaggi** | 12.1 ricorrenza/`serie_id` (**B41**) · 12.2 locale chiuso (**B42**) · 12.3 **`/calls`** "cercasi artisti" + candidature | nessuno nuovo |
| **13 — SEO, legal, audit e polish finale** | **B09 + B44 + B45** (OG di default, favicon, anteprime delle schede) · `/privacy`, `/terms`, `/cookies` **reali** per GDPR e pagamenti + banner cookie · **notice & takedown** · audit RLS · pagina **500** · README + checklist env · pulizia fixture · **remake parte 2** · **B46/B47** (serate simili, visti di recente) · generatore social AI (facoltativo) | Anthropic solo se si fa il generatore |

### Cancelli prima dell'apertura al pubblico

| Cancello | Perché | Dove vive |
| --- | --- | --- |
| **Dominio definitivo** (B14) | senza dominio verificato Resend e Supabase Auth non scrivono a estranei | prima della Fase 7 |
| **Conferma email + SMTP** (B35, B08) | oggi `mailer_autoconfirm = true`: si può "ereditare" l'account altrui | Fase 7, prima dei pagamenti |
| **Reset password** (B36) | oggi chi perde la password di un account email è fuori per sempre; chi nasce con Google non può impostarne una | Fase 7/8, prima dell'apertura pubblica |
| **Turnstile lato applicazione** (B11) | oggi il CAPTCHA lo verifica solo Supabase | Fase 8/13 |
| **Vercel Pro** (B16) | Hobby non è commerciale | solo con la Fase 11 |
| **Cancellazione dell'account** (B07) | diritto GDPR promesso e oggi assente | Fase 13 |
| **Backup del database** (nuovo) | il piano free di Supabase **non include backup automatici**: oggi se qualcosa si rompe non torniamo indietro | da fissare entro la Fase 8 |
| **Notice & Takedown** | conseguenza dei profili creati dall'admin | Fase 8 + Fase 13 |

## Stato delle pagine pubbliche (verificato il 22 ottobre 2026)

| Pagina | Stato |
| --- | --- |
| `/about`, `/per-gli-artisti`, `/per-le-venue`, `/contatti`, `/faq` | **veri** (Fase 6.1), con metadata e contenuti it/en |
| `/citta`, `/citta/[city]` | **veri** (Fase 6.2), generati dai dati reali; le città sotto soglia sono `noindex` |
| `/admin/messaggi` | **vera** (Fase 6.3): coda messaggi con stati, filtri e risposta `mailto:` |
| `/privacy`, `/terms`, `/cookies` | **segnaposto** — non contengono testo legale |
| `/artisti`, `/locali` + schede `[slug]` | **veri** (directory con ricerca e filtri) |
| Footer: "Playlist Spotify" e "Social" | **nascosti** finché non ci sono URL reali |
| Animazioni | reveal e hero in CSS + `IntersectionObserver`; **`framer-motion` non è installato**; tilt 3D e parallax restano B12 |

## Suggerimenti da valutare (implementazioni utili, non richieste)

Raccolta di proposte mie, con il posto in cui cadrebbero. Si decide insieme, non le costruisco di mia
iniziativa.

| # | Proposta | Dove | Perché conviene |
| --- | --- | --- | --- |
| S1 | **Pagine per città** (`/citta`, `/citta/[city]`) generate dai dati reali, con JSON-LD | ✅ Fase 6.2 | È la leva SEO più forte che abbiamo: "concerto a Milano stasera" è la ricerca vera. Fatte con soglia e `noindex` per le città sottili |
| S2 | **Calendario personale `.ics` dei Preferiti** (`/api/me/ical`) | Fase 7 | Il codice del calendario c'è già (3.4): chi salva le serate se le porta sul telefono, e ci torna |
| S3 | **Backup settimanale** del database (script + GitHub Action, o export dal pannello) | Fase 8 | Il piano free non ha backup: è l'unico rischio che può cancellare mesi di lavoro |
| S4 | **Contatori propri in Postgres** (visite profilo, click Spotify, aggregati al giorno) invece di analytics di terze parti | Fase 10/11 | Servono alle statistiche Pro, restano privacy-friendly (nessun cookie, nessun dato personale) → **niente banner cookie per gli analytics** |
| S5 | **"Non trovi il locale? segnalalo"** (modulo breve che crea una richiesta per l'admin) | Fase 8 | Fa crescere il database dei locali con gli occhi dei fan; atterra nel centro assistenza già previsto |
| S6 | **Serate simili / "vicino a questa"** in fondo alla pagina evento | → B46 (Fase 13) | Non fatta nella Fase 5. Allunga la scoperta da una serata all'altra, con query già pronte |
| S7 | **Visti di recente** sulla Home | → B47 (Fase 13) | Non fatta nella Fase 5. Piccolo, aiuta a ritrovare ciò che si era guardato |
| S8 | **PWA installabile** con i Preferiti disponibili offline | Fase 13 | Sul telefono OpenStage diventa "un'app", senza app store |
| S9 | **Prova end-to-end automatica** (Playwright su GitHub Actions) del percorso principale | Fase 13 | Oggi ogni prova è a mano: con 13 fasi davanti, un test automatico evita le regressioni |
| S10 | **Widget incorporabile** per i locali (già nel Venue Pro) reso **libero per tutti** | Fase 11 | Un locale che incolla OpenStage sul suo sito ci porta traffico gratis: la visibilità la dà il prodotto, non il pagamento |

## Decisioni prese (19 ottobre 2026, aggiornate il 22 ottobre 2026)

| # | Decisione |
| --- | --- |
| 1 | **Pro = strumenti, non visibilità.** Il Pro vende identità, strumenti e dati (galleria, copertina, statistiche, share card senza watermark, widget). **Mai** priorità comprata in ricerca, mappa, playlist o In Evidenza: sarebbe il pay-to-play vietato da `AGENTS.md`. Cosa resta libero per sempre si decide alla Fase 11 |
| 2 | **Dominio non ancora comprato**: la Fase 7 (email) lo aspetta |
| 3 | **Tempi**: nessuna fretta, orizzonte 1–2 mesi per il lancio. La qualità prima della velocità |
| 4 | **`is_unclaimed` non si reintroduce** come colonna: si ricava dall'assenza di profilo collegato |
| 5 | **`is_demo` non si crea**: la pulizia dei dati di prova resta la procedura SQL documentata a fine blocco |
| 6 | **Il remake grafico si fa in due tempi**: prima il sistema e il guscio (Fase 5), poi i dettagli (Fase 13). Così le pagine costruite dopo nascono già nel look nuovo e non si rifà due volte lo stesso lavoro |
| 7 | **Nessuna funzione di recensioni o valutazioni pubbliche** dei locali e delle serate: le valutazioni restano una raccolta interna di proposte (vedi `S1`–`S10`), non una funzione per gli utenti. Fedele a "niente metriche vanitose" |
| 8 | **Niente Framer Motion per ora**: il guscio e le pagine usano CSS + `IntersectionObserver`. Il tilt 3D e il parallax restano B12. In Fase 13 Framer Motion entra **solo** per interazioni che lo giustificano, con budget massimo 20 KB gzip (`docs/design-system.md`) |
| 9 | **Risposta ai messaggi**: per ora `mailto:`; casella ufficiale e risposta integrata solo in Fase 7 (B48). Il pulsante non dipende da Resend |
