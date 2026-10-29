# OpenStage — Roadmap approvata

> **Approvata dal proprietario il 19 ottobre 2026**, aggiornata il **23 ottobre 2026** con
> la **Fase 5.5 — Coerenza visiva**, la divisione della **Fase 7 in 7A/7B**, la
> **control room della Fase 8** e la **politica “email minime + notifiche in-app”**.
> **Ultimo commit di codice: `a4a8665` (28 ottobre 2026, "Fase 9A: conteggio follow").**
> **Riallineata il 28 ottobre 2026** dopo la chiusura di 7B, Fase 8 e Fase 9A.
> Fonte unica: se la tabella del manuale dice altro, vale questa. Il manuale (e il PDF) si
> aggiornano **solo su richiesta** ("aggiorna pdf").
>
> **Design e movimento**: `docs/design-system.md` (approvato il 21 ottobre 2026) è il
> riferimento per colori, tipografia, spazi, glass, animazioni, mobile e accessibilità.
>
> Regola ferma: ogni fase passa la build, è testabile in produzione e finisce con un commit
> "Fase N". Ogni fase apre con il parere critico e la lista dei servizi esterni in chat.

## Stato

| Fase | Stato |
| --- | --- |
| **1 → 6** (1, 1.2, 1.3, 2, 3, 4, 5, 6.1 → 6.3) | ✅ fatte e in produzione |
| **5.5A → 5.5E** | ✅ fatte e in produzione |
| **7A** | ✅ email reale, conferma account, reset password, Turnstile, B48 |
| **7B** | ✅ coda, webhook, preferenze, notifiche in-app, digest e Area Fan |
| **8** (8.0 → 8.8.4, B74 → B81, backup e restore test) | ✅ fatte; resta **8.8.5** facoltativa (triage AI) |
| **9A** | ✅ follow di artisti/locali, notifica nuovi eventi, digest, conteggio follower |
| **9B** | ⏸ **rimandata**: manca un premio chiaro e una regola anti-abuso |
| **10** | ✅ **10A, 10B, 10D e 10E fatte**; playlist reale attiva. **10C** (gestione playlist da admin) resta facoltativa. Piano: `docs/plan-phase-10.md` |
| **11** | ▶ **in corso**: Pro operativo per artisti e locali (strumenti, zero visibilità). **Niente beta: vendita al lancio**, dopo legali, fiscalità e PayPal |
| **12** | ⬜ serie, locale chiuso, bacheca ingaggi |
| **13** | ⬜ SEO, legal, cancellazione account, audit e polish |
| **14** | ⬜ Help Center completo (B73), dopo la 13 |

La regola sui canali è in **`docs/notifications-email-policy.md`**: email solo per ciò che
serve anche a chi non entra nel sito; il resto è in-app. La quota Resend riservata alle email
di autenticazione non può essere consumata da digest o avvisi di vanità.

## Le fasi

| Fase | Contenuto | Servizi esterni / prerequisiti |
| --- | --- | --- |
| **✅ 4 — Qualità dei dati e moderazione** | 4.1 **B38** qualità della posizione (città dal pin, filtro distanza onesto, pin impossibile rifiutato, "come arrivare") · 4.2 **B39** serate collegate (locale→artista, avviso doppione, unione dall'admin) · 4.3 **B40** moderazione dopo la pubblicazione (`reports`, sospensione, visibilità ridotta solo per gli account segnalati) | **nessuno** — solo migration Supabase |
| **✅ 5 — Remake grafico, parte 1: sistema e guscio** | Design token definitivi, navbar e footer, **Home 5.4** (bento grid, hero animato, scroll-reveal), componenti base, mappa. **Decisione del 22 ottobre 2026: niente Framer Motion**; animazioni CSS + `IntersectionObserver`, `prefers-reduced-motion` rispettato. Le pagine interne non hanno ancora la stessa coerenza: se ne occupa la **5.5** | nessuno |
| **✅ 6 — Pagine pubbliche ed editoriali** | Fatte: `/about`, `/per-gli-artisti`, `/per-le-venue`, `/contatti` (con **form reale** che scrive in database), **`/faq`**, **`/citta`** e **`/citta/[city]`**; footer con link reali e social/playlist **nascosti** se mancano URL. La 6.3 ha aggiunto la coda messaggi in `/admin/messaggi`. Contenuti redazionali in italiano e inglese | nessuno (materiale del proprietario) |
| **5.5 — Coerenza visiva, remake parte 2** | Riportare le pagine interne al linguaggio della Home 5.4, senza rifare la logica: **5.5A** login, registrazione, account e onboarding · **5.5B** scheda evento e popup/bottom sheet della mappa · **5.5C** directory artisti/locali e schede · **5.5D** guscio dashboard, panoramica, ingresso Profilo, **I miei eventi** e **Preferiti** (solo pelle, logica esistente) · **5.5E** **editor eventi** crea/modifica (campi, mappa, copertina, anteprima, azioni; solo restyling e UX, nessun campo nuovo). Un blocco alla volta, con build e QA. **Nessun servizio nuovo, nessun Framer Motion, nessun dato finto**. **Stato: 5.5A–E completate** | **nessuno** |
| **7A — Email reale e accesso affidabile** | 7.1 Resend + SMTP di Auth + dominio + `lib/email` astratto · **B35** conferma email · **B36** reset password e password per account Google · **B48** risposta ai messaggi senza `mailto:` · template it/en per questi flussi. **Niente coda**: invio sincrono, con errore esplicito se Resend non risponde. **Stato: 7A completata — dominio, Resend, SMTP, conferma/reset cross-browser, Turnstile e B48 fatti** | **dominio**, account Resend, SMTP verificato. Vercel Pro **no** |
| **7B — Email Engine completo + Area Fan** | 7.2 `email_queue`/`email_log` + worker (`pg_cron` + Edge Function) con tetto 2 invii/sec, retry ×3 e backoff, `idempotency_key` · 7.3 webhook Resend (consegnate/rimborsate/spam) · 7.4 template completi · 7.5 preferenze + tetto 1/settimana + **disiscrizione senza login** · 7.6 Area Fan (Per te, Promemoria, Impostazioni, **centro notifiche**) · 7.7 **notifiche in-app**: tabella `notifications`, badge, pagina, preferenze, digest; **B43** diventa in-app + digest, non email a tutti · 7.8 classi email e **quota riservata** (`auth`, `transactional`, `digest`, `optional`) · include **B26, B28** (in-app, email solo digest opt-in); **B08/B35** sono nella 7A. Richiede la 7A. **Stato: 7B completata — notifiche, coda, webhook, preferenze, digest e Area Fan** | Fase 7A completata; politica in `docs/notifications-email-policy.md` |
| **8 — Pannello Admin + Claim a invito** | **8.0 control room modulare** (registro moduli, overview “da fare adesso”, ricerca, responsive, 2FA, audit) · 8.1 admin con **2FA (AAL2)** + registro azioni · 8.2 metriche reali · 8.3 eventi/utenti/segnalazioni · 8.4 "crea per conto di" + **`/claim/[token]`** (invito email) · 8.5 centro assistenza/ticket (agganciato al form di `/contatti`) · 8.6 **Comunicazione**: registro email, coda, quota Resend, riprova controllata, export CSV/JSON · 8.7 pannello notifiche in-app e audit · **8.8 AI assistita** (bozze risposte, import eventi, verifica schede, qualità dati; sempre con approvazione umana) | **7A** (email); **7B** (notifiche e coda); **5.5D** per il linguaggio visivo condiviso. Piano: `docs/plan-fase-8.md`  **Stato: 8.0-8.7, 8.8.1-8.8.4, B74-B79 e backup 8.9 fatti; resta 8.8.5 (facoltativo)** |
| **9 — Community: segui e inviti virali** | **"Segui"** artista e locale (tabella `follows`, base per il digest della Fase 7) · **inviti virali** `/invite/CODICE` nel dashboard artista, con riscatto automatico (3 invitati con email verificata e almeno 1 evento pubblicato). **Stato: 9A completa il 28 ottobre 2026 (follow + conteggio pubblico dei follower, commit `a4a8665`); 9B inviti rimandata** | nessuno |
| **10 — Spotify e Area Artista/Locale** | Form Spotify nel profilo (brani/album/ID), **sticky player** persistente, `/playlists` con le playlist OpenStage; **moduli ruolo-specifici** per artista e locale dentro il guscio della 5.5D (profilo, eventi, completezza, strumenti). **Niente dashboard duplicate**. Divisa in **10A** Spotify (link validati, player, `/playlists` con tabella `spotify_playlists`, dock) e **10B** moduli ruolo (completezza, prossime serate, follower del proprietario, azioni rapide); **10C** gestione playlist da admin. Piano: `docs/plan-phase-10.md`. **Stato: 10A, 10B, 10D e 10E fatte** (Spotify, `/playlists`, sezione playlist in Home, dock, moduli ruolo, link social con icone, proposte con verifica link e coda admin). **Playlist reale attiva dal 29 ottobre 2026** | nessuno (embed Spotify è gratuito, nessuna API key) |
| **11 — Pro operativo (solo strumenti, zero visibilità)** | **11A**: entitlements, gating, area Pro (solo dashboard), box richieste. **11B.1**: contatti/booking **gratuiti** tra artisti e locali + **EPK artista**. **11B.2**: pipeline booking, analytics aggregate, export, widget locale (base gratis, Pro personalizzato). **11C**: **PayPal Orders una tantum** (pass 12 mesi), legali, fiscalità, lancio. **Stato: 11A fatta.** **Zero**: donazioni, Stripe, abbonamenti, badge, priorità, limiti al contatto, Pro in Home. | **Vercel Pro**, PayPal **Business**, consulenza fiscale e legali prima di incassare |
| **12 — Serie, locali chiusi, bacheca ingaggi** | 12.1 ricorrenza/`serie_id` (**B41**) · 12.2 locale chiuso (**B42**) · 12.3 **`/calls`** "cercasi artisti" + candidature | nessuno nuovo |
| **13 — SEO, legal, audit e polish finale** | **B09 + B44 + B45** (OG di default, favicon, anteprime delle schede) · `/privacy`, `/terms`, `/cookies` **reali** per GDPR e pagamenti + banner cookie · **notice & takedown** · audit RLS · pagina **500** · README + checklist env · pulizia fixture · **B46/B47** (serate simili, visti di recente) · generatore social AI (facoltativo). **Non si rifanno le pagine della 5.5**: qui solo rifiniture e contenuti | Anthropic solo se si fa il generatore |
| **14 — Help Center completo** | **B73**: `/aiuto` con ricerca, categorie, articoli, feedback utile/non utile e CTA ai contatti; contenuti gestiti dalla control room (`/admin/aiuto`), non da Zendesk. Tabelle `help_categories`, `help_articles`, `help_feedback`; Markdown IT/EN, bozza/pubblicato, SEO con `pg_trgm`/full-text. `/faq` viene assorbita o reindirizzata. Solo dopo la 13, con l'audit dei ticket reali | nessuno |

## Ordine operativo (deciso il 23 ottobre 2026)

1. **5.5A** — login, registrazione, account e onboarding. **Completata** e testata in
   produzione. Piano: `docs/plan-fase-5.5A.md`.
2. **7A** — **completata**: dominio, Resend, SMTP, conferma email, reset password, Turnstile
   verificato lato Supabase e **B48** (notifica e risposta ai messaggi senza `mailto:`).
3. **5.5B** — scheda evento e popup/bottom sheet della mappa. **Completata** e in produzione.
4. **5.5C** — directory artisti/locali e schede. **Completata** e in produzione.
5. **5.5D** — guscio dashboard, panoramica, ingresso Profilo, I miei eventi e Preferiti.
   **Completata** e in produzione. Piano: `docs/plan-fase-5.5D.md`.
6. **5.5E** — editor eventi crea/modifica: restyling e UX, nessun campo nuovo. **Completata**
   e in produzione. Piano: `docs/plan-fase-5.5E.md`.
7. **7B** — coda, webhook, preferenze, notifiche in-app, digest e Area Fan. **Completata.**
8. **Fase 8** — control room, pannello admin, claim a invito, notice & takedown, backup e
   restore test. **Completata** (resta 8.8.5 facoltativa).
9. **9A** — follow di artisti/locali, notifica nuovi eventi, digest e conteggio follower.
   **Completata** il 28 ottobre 2026. **9B** inviti virali: **rimandata** finché non ci sono
   premio e regola anti-abuso.
10. **10A → 10B** — Spotify, Area artista/locale e link social. **Completate il 28 ottobre
    2026**; il dock si accende quando arrivano playlist reali.
11. **11A → 11C** — Pro operativo: 11A (fondazioni), 11B.1 (contatti gratuiti + EPK),
    11B.2 (booking Pro, analytics, export, widget), 11C (PayPal Orders una tantum, legali,
    fiscalità, lancio). Niente beta: vendita al lancio.
12. **12** — serie, locali chiusi e bacheca ingaggi.
13. **13** — SEO, legal, cancellazione account, audit RLS e polish finale: è il **cancello
    d'ingresso** all'apertura pubblica.
14. **14** — Help Center completo (B73), dopo la 13.

La 5.5 non è un "grande restyling" unico: ogni blocco è indipendente, verificabile e
committabile. Non si mescolano restyling e logica nella stessa modifica.

### Cancelli prima dell'apertura al pubblico

| Cancello | Perché | Dove vive |
| --- | --- | --- |
| **Dominio definitivo** (B14) | senza dominio verificato Resend e Supabase Auth non scrivono a estranei | ✅ **chiuso in 7A** (`getopenstage.it`) |
| **Conferma email + SMTP** (B35, B08) | si poteva "ereditare" l'account altrui | ✅ **chiuso in 7A** |
| **Reset password** (B36) | chi perde la password non rientrava più | ✅ **chiuso in 7A** |
| **Coerenza visiva delle pagine interne** | login, eventi, directory, dashboard e editor sembravano un altro prodotto | ✅ **chiuso in 5.5A–E** |
| **Turnstile lato applicazione** (B11) | il CAPTCHA era verificato solo da Supabase | ✅ **chiuso in 7A** |
| **Vercel Pro** (B16) | Hobby non è commerciale: serve per incassare | **prima della 11C**, non per costruire 11A/11B |
| **Fiscalità e incasso** | persona fisica + PayPal Business: regime, IVA, fatture, rimborsi | commercialista, **prima della 11C** |
| **Cancellazione dell'account** (B07) | diritto GDPR promesso e oggi assente | Fase 13 |
| **Backup del database** | il piano free non include backup automatici | ✅ **chiuso**: `db-backup.yml` settimanale, artifact + bucket privato, restore test verde |
| **Notice & Takedown** | conseguenza dei profili creati dall'admin | **Fatto in 8.11** |
| **Quota Resend protetta** | se la quota finisce si fermano anche conferma e reset | ✅ **chiuso in 7B**, control room 8.6 |
| **Notifiche in-app** | cancellazioni e follow non possono bruciare email | ✅ **chiuso in 7B** |

## Stato delle pagine pubbliche (verificato il 23 ottobre 2026)

| Pagina | Stato |
| --- | --- |
| `/about`, `/per-gli-artisti`, `/per-le-venue`, `/contatti`, `/faq` | **veri** (Fase 6.1), con metadata e contenuti it/en |
| `/citta`, `/citta/[city]` | **veri** (Fase 6.2), generati dai dati reali; le città sotto soglia sono `noindex` |
| `/login`, `/register` | **funzionanti**; restyling **5.5A fatto** |
| `/account`, onboarding artista/locale | **funzionanti**; restyling **5.5A fatto** |
| `/artisti`, `/locali` + schede `[slug]` | **veri** (directory con ricerca e filtri); restyling **5.5C fatto**; link social come icone dalla **10B** |
| `/eventi/<citta>/<slug>` e `/eventi/<id>` | **vere**; restyling editoriale **5.5B fatto**: copertina-first, metadati in righe, azioni in fondo |
| Mappa e popup/bottom sheet | **funzionanti**; popup e bottom sheet allineati nella **5.5B** |
| `/forgot-password`, `/reset-password` | **veri** (7A): link reale via Resend/Supabase, pagina nuova password e gestione link scaduto |
| `/dashboard`, `/dashboard/events`, `/dashboard/saved` | **funzionanti**; guscio e pagine **5.5D**; dalla **10B** la panoramica mostra completezza scheda, follower, prossime serate e azioni rapide. Filtri/duplica restano **B58** |
| `/dashboard/events/new`, `/dashboard/events/[id]` | **funzionanti**; restyling editor **5.5E fatto**. Nessun campo nuovo: `ends_at`, serie e festival restano **B41/Fase 12** |
| `/playlists` | **attiva**: playlist reale `OpenStage — Selezione`, in footer e sitemap; sezione dedicata in fondo alla Home. Torna `noindex` solo se la tabella resta vuota |
| `/admin/messaggi` | **vera** (Fase 6.3): coda messaggi con stati e filtri; la risposta `mailto:` diventa integrata nella **7A** |
| `/privacy`, `/terms`, `/cookies` | **segnaposto** — non contengono testo legale. Cancello della **Fase 13** |
| Footer: "Playlist Spotify" e "Social" | **nascosti** finché non ci sono URL reali |
| Animazioni | reveal e hero in CSS + `IntersectionObserver`; **`framer-motion` non è installato**; tilt 3D e parallax restano B12 |

## Suggerimenti da valutare (implementazioni utili, non richieste)

Raccolta di proposte mie, con il posto in cui cadrebbero. Si decide insieme, non le costruisco di mia
iniziativa.

| # | Proposta | Dove | Perché conviene |
| --- | --- | --- | --- |
| S1 | **Pagine per città** (`/citta`, `/citta/[city]`) generate dai dati reali, con JSON-LD | ✅ Fase 6.2 | È la leva SEO più forte che abbiamo: "concerto a Milano stasera" è la ricerca vera. Fatte con soglia e `noindex` per le città sottili |
| S2 | **Calendario personale `.ics` dei Preferiti** (`/api/me/ical`) | Fase 13 (non fatta in 7B) | Il codice del calendario c'è già (3.4): chi salva le serate se le porta sul telefono, e ci torna |
| S3 | **Backup settimanale** del database (script + GitHub Action, o export dal pannello) | Fase 8 | Il piano free non ha backup: è l'unico rischio che può cancellare mesi di lavoro. **Stato: attivo.** Workflow `db-backup.yml`, primo dump verificato il 27 ottobre 2026, artifact GitHub + bucket privato `backups`; restore test superato il 28 ottobre 2026 su Postgres temporaneo |
| S4 | **Contatori propri in Postgres** (visite profilo, click Spotify, aggregati al giorno) invece di analytics di terze parti | Fase 11 | Servono alle statistiche Pro, restano privacy-friendly (nessun cookie, nessun dato personale) → **niente banner cookie per gli analytics** |
| S5 | **"Non trovi il locale? segnalalo"** (modulo breve che crea una richiesta per l'admin) | Fase 8 | Fa crescere il database dei locali con gli occhi dei fan; atterra nel centro assistenza già previsto |
| S6 | **Serate simili / "vicino a questa"** in fondo alla pagina evento | → B46 (Fase 13) | Non fatta nella Fase 5. Allunga la scoperta da una serata all'altra, con query già pronte |
| S7 | **Visti di recente** sulla Home | → B47 (Fase 13) | Non fatta nella Fase 5. Piccolo, aiuta a ritrovare ciò che si era guardato |
| S8 | **PWA installabile** con i Preferiti disponibili offline | Fase 13 | Sul telefono OpenStage diventa "un'app", senza app store |
| S9 | **Prova end-to-end automatica** (Playwright su GitHub Actions) del percorso principale | Fase 13 | Oggi ogni prova è a mano: con 13 fasi davanti, un test automatico evita le regressioni |
| S10 | **Widget incorporabile** per i locali | Fase 11 | Un locale che incolla OpenStage sul suo sito ci porta traffico gratis: la visibilità la dà il prodotto, non il pagamento. Da decidere quanto lasciare gratuito e cosa riservare al Pro |

## Decisioni prese (19 ottobre 2026, aggiornate il 23 ottobre 2026)

| # | Decisione |
| --- | --- |
| 1 | **Pro = strumenti, non visibilità.** Il Pro vende identità, strumenti e dati (galleria, copertina, statistiche, share card senza watermark, widget). **Mai** priorità comprata in ricerca, mappa, playlist o In Evidenza: sarebbe il pay-to-play vietato da `AGENTS.md`. Cosa resta libero per sempre si decide alla Fase 11 |
| 2 | **Dominio acquistato**: `getopenstage.it` è stato comprato con bundle email Aruba. La 7A aspetta l'attivazione DNS e la verifica Resend/SMTP |
| 3 | **Tempi**: nessuna fretta, orizzonte 1–2 mesi per il lancio. La qualità prima della velocità |
| 4 | **`is_unclaimed` non si reintroduce** come colonna: si ricava dall'assenza di profilo collegato |
| 5 | **`is_demo` non si crea**: la pulizia dei dati di prova resta la procedura SQL documentata a fine blocco |
| 6 | **Il remake grafico si fa in tre tempi**: sistema e guscio (Fase 5), pagine interne (Fase 5.5), rifiniture finali (Fase 13). Fase 13 non rifà ciò che è già stato fatto nella 5.5 |
| 7 | **Nessuna funzione di recensioni o valutazioni pubbliche** dei locali e delle serate: le valutazioni restano una raccolta interna di proposte (vedi `S1`–`S10`), non una funzione per gli utenti. Fedele a "niente metriche vanitose" |
| 8 | **Niente Framer Motion per ora**: il guscio e le pagine usano CSS + `IntersectionObserver`. Il tilt 3D e il parallax restano B12. In Fase 13 Framer Motion entra **solo** per interazioni che lo giustificano, con budget massimo 20 KB gzip (`docs/design-system.md`) |
| 9 | **Risposta ai messaggi**: `mailto:` resta solo fino alla **7A**; poi risposta integrata dalla coda con casella ufficiale e Resend (B48), con fallback "Copia indirizzo" |
| 10 | **Fase 5.5 approvata**: login/registrazione/account prima; poi scheda evento e popup; poi directory e schede; poi guscio dashboard e pagine esistenti (**5.5D**); infine editor eventi (**5.5E**). Ogni blocco è separato, con build e QA. **5.5A e 5.5B completate**; la 7A lato autenticazione è chiusa, resta B48 |
| 11 | **Fase 7 divisa in 7A e 7B**: la 7A chiude infrastruttura, conferma email, reset password e risposta ai messaggi; la 7B aggiunge coda, worker, webhook, preferenze e Area Fan. Niente coda nella 7A: invio sincrono con errore esplicito |
| 12 | **Dashboard**: un solo guscio con moduli diversi per artista e locale. Non si duplicano le dashboard. La **5.5D** fa guscio, panoramica, ingresso Profilo, I miei eventi e Preferiti usando la logica esistente; la **5.5E** fa l'editor eventi. I moduli funzionali nuovi e le azioni di ruolo vivono nella **Fase 10**. Il Profilo resta la pagina `/account` già rifatta nella 5.5A, ma dal guscio deve essere chiaro come tornare alla dashboard |
| 13 | **Nel restyling niente immagini finte, stock o statistiche inventate**: se manca una copertina si usa la tipografia-poster, non un'immagine di repertorio |
| 14 | **Fase 8 = control room modulare**, non una pagina unica: sidebar su desktop, tab raggruppati su mobile, una rotta per modulo, overview “da fare adesso”, ricerca globale, audit e 2FA. I pannelli si aggiungono da un registro moduli; la lista finale si completa con il proprietario prima di costruire (`docs/plan-fase-8.md`) |
| 15 | **Email minime, notifiche in-app come default**: email solo per conferma, reset, sicurezza, ricevute, risposta 1:1 e inviti con token. Cancellazioni, follow, promemoria e moderazione sono in-app; il digest settimanale è opt-in (`docs/notifications-email-policy.md`) |
| 16 | **Quota Resend protetta**: classi `auth`, `transactional`, `digest`, `optional`; riserva per auth/sicurezza; dry run e conferma prima degli invii massivi; nessun tracking |
| 17 | **Barra mobile ruolo-specifica**: non loggati mantengono `Esplora · Mappa · Artisti · Locali · Accedi`; loggati hanno `Esplora · Notifiche · Artisti · Locali · Profilo`. La mappa resta raggiungibile da Esplora e da `/mappa`; l'admin non ha barra pubblica |
| 18 | **Modello Pro 2026**: Pro per artisti e locali **solo con strumenti operativi e analytics**; niente donazioni, niente Stripe, niente vantaggi di visibilità o badge. Contatto e booking restano gratuiti. Il box “richiesta strumento” è un canale di co-sviluppo, non un diritto a una funzione. Pagamenti con PayPal Subscriptions. |
| 19 | **Niente beta Pro**: si va in vendita direttamente. Il Pro non è un test chiuso e non si regala per feedback: **14 giorni soddisfatti o rimborsati**. Legali, fiscalità, PayPal Business e Vercel Pro sono prerequisiti di lancio. |
| 20 | **Vendita come persona fisica** con PayPal Business. Il regime fiscale (IVA, fatture, rimborsi) va confermato con un commercialista prima della 11C; PayPal Business non basta da solo. |
| 21 | **Pro invisibile in Home**: nessun riferimento a piani, prezzi o upgrade in Home, navbar, footer, schede pubbliche o sitemap. Solo dashboard di artisti e locali, pagine `noindex`. |
| 22 | **Pagamento unico annuale**: Pro Artista 49 €/12 mesi, Pro Locale 149 €/12 mesi, IVA inclusa, 14 giorni soddisfatti o rimborsati. Nessun abbonamento, nessun rinnovo automatico. Prezzo fondatore per i primi 50. |
