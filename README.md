# OpenStage

Piattaforma per scoprire eventi di musica dal vivo, con focus su artisti indipendenti e locali.
Next.js App Router, Supabase (Auth + Postgres + RLS), Tailwind, MapLibre, Resend e Vercel.

## Comandi

```bash
npm install
npm run dev        # sviluppo su http://localhost:3000
npm run build      # build di produzione
npm run start      # build locale
npm run manuale    # rigenera docs/manuale/OpenStage-Manuale.pdf
npm run manuale -- --anteprima  # rigenera anche docs/manuale/anteprima.html
```

## Configurazione

1. Copia `.env.example` in `.env.local` e compila i valori.
2. Applica le migrazioni in `supabase/migrations/` in ordine.
3. Verifica che `settings.admin_email` nel database coincida con `ADMIN_EMAIL`.
4. Su Vercel imposta le stesse variabili su Production, Preview e Development.
5. Per il backup del database imposta i quattro secret GitHub descritti in `docs/backup.md`.

Le variabili principali sono Supabase, Turnstile, Resend e la coda email, Telegram (due bot:
code admin e attività), URL del sito e, facoltativamente, Spotify e Photon.


## Privacy e dati

- Testi legali reali in `lib/legal/content.ts`, mostrati da `/privacy`, `/terms`, `/cookies`.
- Titolare: `OpenStage — Francesco Sorrentino` (dicitura da confermare); contatto `ciao@getopenstage.it`.
- Cookie: solo tecnici (sessione, lingua, ritorno OAuth, preferenza player). Nessun banner perché
  non ci sono cookie di profilazione.
- Il player Spotify è **click-to-load**: nessun iframe di terze parti prima del consenso.
- Export dati: `/dashboard/impostazioni/esporta` (JSON).
- Cancellazione account: `/dashboard/impostazioni`, conferma scritta `ELIMINA`. Le FK `set null`
  proteggono schede, thread e messaggi delle altre persone; le serate restano online.

## Variabili d'ambiente

Tutte vanno impostate su Vercel (Production, Preview, Development). Il file `.env.example` è la lista completa.

| Gruppo | Variabili | Obbligatorie |
| --- | --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sì |
| Supabase (server) | `SUPABASE_SERVICE_ROLE_KEY` | sì: admin e **cancellazione account** |
| Sito | `NEXT_PUBLIC_SITE_URL` | sì |
| Form sicuri | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | sì |
| Email | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | sì |
| Email (coda) | `RESEND_WEBHOOK_SECRET`, `UNSUBSCRIBE_SECRET`, `EMAIL_WORKER_SECRET`, limiti quota | per i digest |
| Admin | `ADMIN_EMAIL` | sì |
| Spotify | `NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID` | facoltativa |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `TELEGRAM_ACTIVITY_BOT_TOKEN`, `TELEGRAM_ACTIVITY_CHAT_ID` | facoltative |
| AI | `AI_GATEWAY_API_KEY`, modello, budget | facoltative |
| Geocoder | `GEOCODER_URL` | facoltativa (fallback interno) |
## Struttura

| Percorso | Contenuto |
| --- | --- |
| `app/` | pagine, route handler e server action |
| `components/` | UI pubblica, dashboard, admin e claim |
| `lib/` | query, auth, email, Telegram, AI e utility |
| `supabase/migrations/` | schema, RLS, funzioni e trigger |
| `docs/` | roadmap, piani, backlog, design system e manuale |
| `docs/manuale/` | sorgenti Markdown e PDF del manuale |

## Documentazione

- `docs/roadmap.md` — fasi e stato.
- `docs/plan-fase-8.md` — control room, claim a invito, assistenza e AI.
- `docs/backlog.md` — cose rimandate.
- `docs/design-system.md` — linguaggio visivo.
- `docs/manuale/OpenStage-Manuale.pdf` — manuale completo (sorgenti in `docs/manuale/`).

## Deploy

Il deploy di produzione passa da GitHub → Vercel. Dopo ogni fase: build verde, deploy e commit
con il nome della fase.
