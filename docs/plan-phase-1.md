# Piano Fase 1 — Fondamenta, Autenticazione e Struttura

> Documento di pianificazione (regola AGENTS.md #1). Nessun dato finto: ogni feature si collega a Supabase reale fin dal primo giorno.

## Obiettivi della fase

1. Scaffold del progetto **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4**.
2. **Design system** dark cyber-neon + **Navbar glass** + **Footer** con pagine legali.
3. **i18n** modulare IT/EN con rilevamento geografico (Vercel) + selettore manuale.
4. **Paginazione** riutilizzabile (12/pagina) e **slot player Spotify persistente**.
5. **Autenticazione reale Supabase**: registrazione con ruolo (Artista / Venue / Fan), login email+password, Google Auth predisposto, **Turnstile** anti-bot.
6. **Onboarding Artista** → redirect a creazione evento.
7. **Migrazione SQL + RLS** per `profiles`, `artists`, `venues`, `events` (con `is_unclaimed`), `settings`.

## Decisioni tecniche confermate (A–G)

| # | Decisione | Scelta |
|---|---|---|
| A | Client Supabase | `@supabase/ssr` (cookie-based, App Router) |
| B | i18n | Dizionario modulare custom IT/EN + geo Vercel + cookie |
| C | Conferma email | Disattivata in Fase 1 (Resend in fase dedicata) |
| D | Region Supabase | `eu-north-1` (progetto reale `tzdigzvkneonkhkwoeed`) |
| E | Admin | `settings` + funzione `is_admin()` (nessun hardcode) |
| F | `is_unclaimed` | flag boolean su `events` |
| G | Stack | Next.js 15 + TypeScript + Tailwind v4 |

## Architettura cartelle

```
app/                      # Rotte (App Router, SSR)
  layout.tsx              # Layout radice (html lang dinamico, provider i18n)
  page.tsx                # Home
  artisti/ locali/ ...     # Pagine pubbliche (segnaposto in Fase 1)
  about/ privacy/ terms/ cookies/
  per-gli-artisti/ per-le-venue/
  login/ register/
  onboarding/artist/      # Onboarding artisti
  events/new/             # Target redirect creazione evento (stub)
  auth/callback/route.ts  # Callback OAuth (Google)
  auth/signout/route.ts
components/
  layout/ Navbar, Footer, SpotifyPlayerDock
  ui/    Button, GlassCard, Pagination, ...
  auth/  Form di autenticazione, TurnstileWidget
i18n/                     # Dizionari modulari it/en
lib/
  supabase/ client.ts, server.ts, middleware.ts, admin.ts
  i18n.ts                 # getLocale / getDictionary
  utils.ts
middleware.ts             # Refresh sessione Supabase + locale da geo/cookie
supabase/migrations/      # SQL + RLS
docs/                     # Piani di fase
```

## Sicurezza e RLS

- Ogni tabella in `public` con **RLS abilitata** e policy esplicite.
- Ruolo utente salvato in `profiles.role` (enum: `fan` | `artist` | `venue` | `admin`), mai fidato dal client.
- Trigger `handle_new_user` su `auth.users` per creare il profilo.
- Admin determinato da `settings.admin_email` + funzione `is_admin()` `SECURITY DEFINER`.
- `is_unclaimed` su `events` per eventi inseriti prima del "claim" della venue.

## Variabili d'ambiente

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL`.

## Definition of Done

- [x] `npm run build` senza errori.
- [x] Auth reale funzionante (registrazione/login/logout) contro Supabase.
- [x] RLS attiva (migrazione idempotente con policy per ogni tabella).
- [x] i18n IT/EN con switch manuale e default da geolocalizzazione.
- [x] Commit Git "Fase 1" + push su GitHub (deploy Vercel).
- [x] Riepilogo finale in 5 righe (test / env vars / SQL).

## Verifica in produzione — 15/10/2026

Deploy: `https://openstage-alpha.vercel.app` (progetto Vercel `openstage`, team `ceskobeatzmusic-2476`).

| Verifica | Esito |
|---|---|
| Build Next.js su Vercel (framework preset corretto) | ✅ |
| Rotte pubbliche + legali + `/login` `/register` `/onboarding/artist` `/events/new` | ✅ 200 |
| Asset `/_next/static/*` (CSS + chunk) | ✅ 200 |
| Middleware: cookie `NEXT_LOCALE` da geo (`x-vercel-ip-country`) + refresh sessione | ✅ |
| Supabase raggiungibile (`tzdigzvkneonkhkwoeed`) | ✅ |
| Migration `0001_init.sql`: 5 tabelle + 18 policy RLS + trigger (`on_auth_user_created`, `*_touch`, `profiles_guard`) | ✅ |
| `settings.admin_email` = `ceskobeatzmusic@gmail.com` | ✅ |
| RLS: lettura anon di `settings` → 0 righe (admin-only) | ✅ |
| Supabase Auth: email+password, Google, `mailer_autoconfirm` on, redirect `localhost:3000` + dominio produzione | ✅ |
| Anti-bot Turnstile attivo lato Supabase (signup senza token rifiutato) | ✅ |
| Site key Turnstile presente nei chunk client di `/login` e `/register` | ✅ |

Nota: il progetto Vercel era stato creato con framework preset "Other", quindi ogni deploy serviva
solo `public/` (nessun asset `.next/static`, middleware in errore `MIDDLEWARE_INVOCATION_FAILED`).
Risolto ricreando il deployment di Production con `projectSettings.framework = "nextjs"`.

Test manuale residuo (richiede un umano per il captcha): registrazione con ruolo
Artista / Venue / Fan → onboarding artista → creazione evento.
