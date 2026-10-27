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
