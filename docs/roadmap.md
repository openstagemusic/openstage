# OpenStage — Roadmap approvata

> **Approvata dal proprietario il 19 ottobre 2026**, aggiornata il **23 ottobre 2026** con
> la **Fase 5.5 — Coerenza visiva**, la divisione della **Fase 7 in 7A/7B**, la
> **control room della Fase 8** e la **politica “email minime + notifiche in-app”**.
> **Ultimo commit di codice: `60f55f8` (22 ottobre 2026).** La **5.5A** è completata e
> pronta per il test in produzione.
> Fonte unica: se la tabella del manuale dice altro, vale questa. Il manuale (e il PDF) si
> aggiornano **solo su richiesta** ("aggiorna pdf").
>
> **Design e movimento**: `docs/design-system.md` (approvato il 21 ottobre 2026) è il
> riferimento per colori, tipografia, spazi, glass, animazioni, mobile e accessibilità.
>
> Regola ferma: ogni fase passa la build, è testabile in produzione e finisce con un commit
> "Fase N". Ogni fase apre con il parere critico e la lista dei servizi esterni in chat.

## Stato

Fasi **1 · 1.2 · 1.3 · 2 · 3 · 4 · 5 · 6** (6.1 → 6.3) **fatte e in produzione** (ultimo
commit di codice `60f55f8`, 22 ottobre 2026). Da qui si riparte dalla **Fase 5.5**, già
approvata: la **5.5A** è **completata** (build verde) mentre Aruba valida il DNS, senza
aspettare le email.

La **Fase 7** è divisa in due blocchi: **7A** (email reale, conferma account, reset password,
risposta ai messaggi) e **7B** (coda, webhook, preferenze, notifiche in-app, digest, Area Fan).
La **7A** parte appena dominio, Resend e SMTP Supabase sono verificati. La **Fase 8** dipende
dalla 7A e dalla 5.5D.

La regola sui canali è in **`docs/notifications-email-policy.md`**: email solo per ciò che
serve anche a chi non entra nel sito; il resto è in-app. La quota Resend riservata alle email
di autenticazione non può essere consumata da digest o avvisi di vanità.

## Le fasi

| Fase | Contenuto | Servizi esterni / prerequisiti |
| --- | --- | --- |
| **✅ 4 — Qualità dei dati e moderazione** | 4.1 **B38** qualità della posizione (città dal pin, filtro distanza onesto, pin impossibile rifiutato, "come arrivare") · 4.2 **B39** serate collegate (locale→artista, avviso doppione, unione dall'admin) · 4.3 **B40** moderazione dopo la pubblicazione (`reports`, sospensione, visibilità ridotta solo per gli account segnalati) | **nessuno** — solo migration Supabase |
| **✅ 5 — Remake grafico, parte 1: sistema e guscio** | Design token definitivi, navbar e footer, **Home 5.4** (bento grid, hero animato, scroll-reveal), componenti base, mappa. **Decisione del 22 ottobre 2026: niente Framer Motion**; animazioni CSS + `IntersectionObserver`, `prefers-reduced-motion` rispettato. Le pagine interne non hanno ancora la stessa coerenza: se ne occupa la **5.5** | nessuno |
| **✅ 6 — Pagine pubbliche ed editoriali** | Fatte: `/about`, `/per-gli-artisti`, `/per-le-venue`, `/contatti` (con **form reale** che scrive in database), **`/faq`**, **`/citta`** e **`/citta/[city]`**; footer con link reali e social/playlist **nascosti** se mancano URL. La 6.3 ha aggiunto la coda messaggi in `/admin/messaggi`. Contenuti redazionali in italiano e inglese | nessuno (materiale del proprietario) |
| **5.5 — Coerenza visiva, remake parte 2** | Riportare le pagine interne al linguaggio della Home 5.4, senza rifare la logica: **5.5A** login, registrazione, account e onboarding · **5.5B** scheda evento e popup/bottom sheet della mappa · **5.5C** directory artisti/locali e schede · **5.5D** guscio dashboard, panoramica, ingresso Profilo, **I miei eventi** e **Preferiti** (solo pelle, logica esistente) · **5.5E** **editor eventi** crea/modifica (campi, mappa, copertina, anteprima, azioni; solo restyling e UX, nessun campo nuovo). Un blocco alla volta, con build e QA. **Nessun servizio nuovo, nessun Framer Motion, nessun dato finto** | **nessuno** |
| **7A — Email reale e accesso affidabile** | 7.1 Resend + SMTP di Auth + dominio + `lib/email` astratto · **B35** conferma email · **B36** reset password e password per account Google · **B48** risposta ai messaggi senza `mailto:` · template it/en per questi flussi. **Niente coda**: invio sincrono, con errore esplicito se Resend non risponde | **dominio**, account Resend, SMTP verificato. Vercel Pro **no** |
| **7B — Email Engine completo + Area Fan** | 7.2 `email_queue`/`email_log` + worker (`pg_cron` + Edge Function) con tetto 2 invii/sec, retry ×3 e backoff, `idempotency_key` · 7.3 webhook Resend (consegnate/rimborsate/spam) · 7.4 template completi · 7.5 preferenze + tetto 1/settimana + **disiscrizione senza login** · 7.6 Area Fan (Per te, Promemoria, Impostazioni, **centro notifiche**) · 7.7 **notifiche in-app**: tabella `notifications`, badge, pagina, preferenze, digest; **B43** diventa in-app + digest, non email a tutti · 7.8 classi email e **quota riservata** (`auth`, `transactional`, `digest`, `optional`) · include **B26, B28** (in-app, email solo digest opt-in); **B08/B35** sono nella 7A. Richiede la 7A | Fase 7A completata; politica in `docs/notifications-email-policy.md` |
| **8 — Pannello Admin + Claim a invito** | **8.0 control room modulare** (registro moduli, overview “da fare adesso”, ricerca, responsive, 2FA, audit) · 8.1 admin con **2FA (AAL2)** + registro azioni · 8.2 metriche reali · 8.3 eventi/utenti/segnalazioni · 8.4 "crea per conto di" + **`/claim/[token]`** (invito email) · 8.5 centro assistenza/ticket (agganciato al form di `/contatti`) · 8.6 **Comunicazione**: registro email, coda, quota Resend, riprova controllata, export CSV/JSON · 8.7 pannello notifiche in-app e audit | **7A** (email); **7B** (notifiche e coda); **5.5D** per il linguaggio visivo condiviso. Piano: `docs/plan-fase-8.md` |
| **9 — Community: segui e inviti virali** | **"Segui"** artista e locale (tabella `follows`, base per il digest della Fase 7) · **inviti virali** `/invite/CODICE` nel dashboard artista, con riscatto automatico (3 invitati con email verificata e almeno 1 evento pubblicato) | nessuno |
| **10 — Spotify e Area Artista/Locale** | Form Spotify nel profilo (brani/album/ID), **sticky player** persistente, `/playlists` con le playlist OpenStage; **moduli ruolo-specifici** per artista e locale dentro il guscio della 5.5D (profilo, eventi, completezza, strumenti). **Niente dashboard duplicate** | nessuno (embed Spotify è gratuito) |
| **11 — Monetizzazione opzionale** | 11.1 Artist Pro 3 € una tantum (PayPal Orders API + webhook con firma verificata) · 11.2 Venue Pro abbonamento (Subscriptions API, ciclo di vita, grazia 3 giorni) · 11.3 vantaggi Pro (galleria, copertina, statistiche, badge, widget) | **Vercel Pro**, dominio, conto PayPal **Business**, decisione fiscale |
| **12 — Serie, locali chiusi, bacheca ingaggi** | 12.1 ricorrenza/`serie_id` (**B41**) · 12.2 locale chiuso (**B42**) · 12.3 **`/calls`** "cercasi artisti" + candidature | nessuno nuovo |
| **13 — SEO, legal, audit e polish finale** | **B09 + B44 + B45** (OG di default, favicon, anteprime delle schede) · `/privacy`, `/terms`, `/cookies` **reali** per GDPR e pagamenti + banner cookie · **notice & takedown** · audit RLS · pagina **500** · README + checklist env · pulizia fixture · **B46/B47** (serate simili, visti di recente) · generatore social AI (facoltativo). **Non si rifanno le pagine della 5.5**: qui solo rifiniture e contenuti | Anthropic solo se si fa il generatore |

## Ordine operativo (deciso il 23 ottobre 2026)

1. **5.5A** — login, registrazione, account e onboarding. **Completata**, da testare in
   produzione mentre Aruba valida il DNS. Piano: `docs/plan-fase-5.5A.md`.
2. **7A** — appena dominio, Resend e SMTP sono verificati. Se Aruba si sblocca prima che la
   5.5A sia finita, la 7A passa davanti: è un cancello di sicurezza.
3. **5.5B** — scheda evento e popup/bottom sheet della mappa.
4. **5.5C** — directory artisti/locali e schede.
5. **5.5D** — guscio dashboard, panoramica, ingresso Profilo, I miei eventi e Preferiti.
   Solo restyling: le funzioni nuove restano nella Fase 10. Piano: `docs/plan-fase-5.5D.md`.
6. **5.5E** — editor eventi crea/modifica: restyling e UX, nessun campo nuovo. Piano:
   `docs/plan-fase-5.5E.md`.
7. **7B** — coda, webhook, preferenze, notifiche in-app, digest e Area Fan, dentro il guscio
   già sistemato.
8. **Fase 8** — control room, pannello admin e claim a invito. La lista dei moduli e delle
   funzioni si completa con il proprietario prima di costruire.

La 5.5 non è un "grande restyling" unico: ogni blocco è indipendente, verificabile e
committabile. Non si mescolano restyling e logica nella stessa modifica.

### Cancelli prima dell'apertura al pubblico

| Cancello | Perché | Dove vive |
| --- | --- | --- |
| **Dominio definitivo** (B14) | senza dominio verificato Resend e Supabase Auth non scrivono a estranei | **7A**; dominio acquistato, attivazione DNS in corso |
| **Conferma email + SMTP** (B35, B08) | oggi `mailer_autoconfirm = true`: si può "ereditare" l'account altrui | **7A**, prima dei pagamenti |
| **Reset password** (B36) | oggi chi perde la password di un account email è fuori per sempre; chi nasce con Google non può impostarne una | **7A**, prima dell'apertura pubblica |
| **Coerenza visiva delle pagine interne** | login, eventi, directory, dashboard e editor non possono sembrare un altro prodotto rispetto alla Home | **5.5A–E**, prima della 7B e dell'apertura |
| **Turnstile lato applicazione** (B11) | oggi il CAPTCHA lo verifica solo Supabase | Fase 8/13 |
| **Vercel Pro** (B16) | Hobby non è commerciale | solo con la Fase 11 |
| **Cancellazione dell'account** (B07) | diritto GDPR promesso e oggi assente | Fase 13 |
| **Backup del database** (nuovo) | il piano free di Supabase **non include backup automatici**: oggi se qualcosa si rompe non torniamo indietro | da fissare entro la Fase 8 |
| **Notice & Takedown** | conseguenza dei profili creati dall'admin | Fase 8 + Fase 13 |
| **Quota Resend protetta** | se la quota finisce, si fermano anche conferma email e reset: le email di autenticazione hanno una riserva | **7B** (classi + quota), control room **8.6** |
| **Notifiche in-app** | le cancellazioni e i follow non possono bruciare centinaia di email; serve il centro notifiche prima di aprire la community | **7B**, dentro il guscio **5.5D** |

## Stato delle pagine pubbliche (verificato il 23 ottobre 2026)

| Pagina | Stato |
| --- | --- |
| `/about`, `/per-gli-artisti`, `/per-le-venue`, `/contatti`, `/faq` | **veri** (Fase 6.1), con metadata e contenuti it/en |
| `/citta`, `/citta/[city]` | **veri** (Fase 6.2), generati dai dati reali; le città sotto soglia sono `noindex` |
| `/login`, `/register` | **funzionanti**; restyling **5.5A fatto** |
| `/account`, onboarding artista/locale | **funzionanti**; restyling **5.5A fatto** |
| `/artisti`, `/locali` + schede `[slug]` | **veri** (directory con ricerca e filtri), ma con card glass generiche: restyling **5.5C** |
| `/eventi/<citta>/<slug>` e `/eventi/<id>` | **vere**; la copertina c'è, ma la gerarchia editoriale va rifinita in **5.5B** |
| Mappa e popup/bottom sheet | **funzionanti**; il popup va allineato in **5.5B** |
| `/dashboard`, `/dashboard/events`, `/dashboard/saved` | **funzionanti**; guscio, panoramica, I miei eventi e Preferiti in **5.5D**; le funzioni nuove (filtri, duplica, azioni multiple) nella **Fase 10** |
| `/dashboard/events/new`, `/dashboard/events/[id]` | **funzionanti**; restyling dell'editor in **5.5E**. Nessun campo nuovo: `ends_at`, serie e festival restano **B41/Fase 12** |
| `/admin/messaggi` | **vera** (Fase 6.3): coda messaggi con stati e filtri; la risposta `mailto:` diventa integrata nella **7A** |
| `/privacy`, `/terms`, `/cookies` | **segnaposto** — non contengono testo legale |
| Footer: "Playlist Spotify" e "Social" | **nascosti** finché non ci sono URL reali |
| Animazioni | reveal e hero in CSS + `IntersectionObserver`; **`framer-motion` non è installato**; tilt 3D e parallax restano B12 |

## Suggerimenti da valutare (implementazioni utili, non richieste)

Raccolta di proposte mie, con il posto in cui cadrebbero. Si decide insieme, non le costruisco di mia
iniziativa.

| # | Proposta | Dove | Perché conviene |
| --- | --- | --- | --- |
| S1 | **Pagine per città** (`/citta`, `/citta/[city]`) generate dai dati reali, con JSON-LD | ✅ Fase 6.2 | È la leva SEO più forte che abbiamo: "concerto a Milano stasera" è la ricerca vera. Fatte con soglia e `noindex` per le città sottili |
| S2 | **Calendario personale `.ics` dei Preferiti** (`/api/me/ical`) | Fase 7B | Il codice del calendario c'è già (3.4): chi salva le serate se le porta sul telefono, e ci torna |
| S3 | **Backup settimanale** del database (script + GitHub Action, o export dal pannello) | Fase 8 | Il piano free non ha backup: è l'unico rischio che può cancellare mesi di lavoro |
| S4 | **Contatori propri in Postgres** (visite profilo, click Spotify, aggregati al giorno) invece di analytics di terze parti | Fase 10/11 | Servono alle statistiche Pro, restano privacy-friendly (nessun cookie, nessun dato personale) → **niente banner cookie per gli analytics** |
| S5 | **"Non trovi il locale? segnalalo"** (modulo breve che crea una richiesta per l'admin) | Fase 8 | Fa crescere il database dei locali con gli occhi dei fan; atterra nel centro assistenza già previsto |
| S6 | **Serate simili / "vicino a questa"** in fondo alla pagina evento | → B46 (Fase 13) | Non fatta nella Fase 5. Allunga la scoperta da una serata all'altra, con query già pronte |
| S7 | **Visti di recente** sulla Home | → B47 (Fase 13) | Non fatta nella Fase 5. Piccolo, aiuta a ritrovare ciò che si era guardato |
| S8 | **PWA installabile** con i Preferiti disponibili offline | Fase 13 | Sul telefono OpenStage diventa "un'app", senza app store |
| S9 | **Prova end-to-end automatica** (Playwright su GitHub Actions) del percorso principale | Fase 13 | Oggi ogni prova è a mano: con 13 fasi davanti, un test automatico evita le regressioni |
| S10 | **Widget incorporabile** per i locali (già nel Venue Pro) reso **libero per tutti** | Fase 11 | Un locale che incolla OpenStage sul suo sito ci porta traffico gratis: la visibilità la dà il prodotto, non il pagamento |

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
| 10 | **Fase 5.5 approvata**: login/registrazione/account prima; poi scheda evento e popup; poi directory e schede; poi guscio dashboard e pagine esistenti (**5.5D**); infine editor eventi (**5.5E**). Ogni blocco è separato, con build e QA. La 5.5A parte mentre Aruba valida il DNS; la 7A ha priorità quando l'infrastruttura email è pronta |
| 11 | **Fase 7 divisa in 7A e 7B**: la 7A chiude infrastruttura, conferma email, reset password e risposta ai messaggi; la 7B aggiunge coda, worker, webhook, preferenze e Area Fan. Niente coda nella 7A: invio sincrono con errore esplicito |
| 12 | **Dashboard**: un solo guscio con moduli diversi per artista e locale. Non si duplicano le dashboard. La **5.5D** fa guscio, panoramica, ingresso Profilo, I miei eventi e Preferiti usando la logica esistente; la **5.5E** fa l'editor eventi. I moduli funzionali nuovi e le azioni di ruolo vivono nella **Fase 10**. Il Profilo resta la pagina `/account` già rifatta nella 5.5A, ma dal guscio deve essere chiaro come tornare alla dashboard |
| 13 | **Nel restyling niente immagini finte, stock o statistiche inventate**: se manca una copertina si usa la tipografia-poster, non un'immagine di repertorio |
| 14 | **Fase 8 = control room modulare**, non una pagina unica: sidebar su desktop, tab raggruppati su mobile, una rotta per modulo, overview “da fare adesso”, ricerca globale, audit e 2FA. I pannelli si aggiungono da un registro moduli; la lista finale si completa con il proprietario prima di costruire (`docs/plan-fase-8.md`) |
| 15 | **Email minime, notifiche in-app come default**: email solo per conferma, reset, sicurezza, ricevute, risposta 1:1 e inviti con token. Cancellazioni, follow, promemoria e moderazione sono in-app; il digest settimanale è opt-in (`docs/notifications-email-policy.md`) |
| 16 | **Quota Resend protetta**: classi `auth`, `transactional`, `digest`, `optional`; riserva per auth/sicurezza; dry run e conferma prima degli invii massivi; nessun tracking |
| 17 | **Barra mobile ruolo-specifica**: non loggati mantengono `Esplora · Mappa · Artisti · Locali · Accedi`; loggati hanno `Esplora · Notifiche · Artisti · Locali · Profilo`. La mappa resta raggiungibile da Esplora e da `/mappa`; l'admin non ha barra pubblica |
