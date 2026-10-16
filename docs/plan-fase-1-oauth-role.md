# Fix Fase 1 — Ruolo con Google OAuth e onboarding

> Documento di pianificazione (regola AGENTS.md #1). Nessun dato finto: ruolo reale su Supabase, nessun default nascosto nel client.

## Problema segnalato

Registrandosi con **Google** il profilo finisce sempre con ruolo `fan` e non compare nessuno step
di profilo; registrandosi con **email + password** il ruolo scelto funziona.

## Cause individuate

1. `supabase.auth.signInWithOAuth()` non trasporta metadati: nel flusso email il form invia
   `data: { role, full_name, city }` a `signUp()`, con Google non arriva nulla → il trigger
   `handle_new_user` applica il default `fan`.
2. `GoogleButton` reindirizza a `next="/"`: nessun onboarding dopo il ritorno dall'OAuth.
3. `prevent_role_escalation` (migration 0001) **annulla in silenzio** ogni cambio di ruolo fatto
   da un utente non-admin (`new.role := old.role`), quindi il ruolo non è correggibile dopo.
4. Effetto collaterale di prodotto: un fan non può mai diventare artista.

## Soluzione (3 parti)

| # | Intervento | File |
|---|---|---|
| 1 | `prevent_role_escalation` blocca **solo** l'assegnazione di `admin`; `fan`/`artist`/`venue` diventano auto-dichiarabili | `supabase/migrations/0002_role_self_service.sql` |
| 2 | Pagina `/onboarding/role` con scelta Fan / Artista / Locale → scrive `profiles.role` + `user_metadata.role` | `app/onboarding/role/page.tsx`, `components/auth/RolePicker.tsx` |
| 3 | `/auth/callback`: se `user_metadata.role` manca (caso Google) → redirect a `/onboarding/role` | `app/auth/callback/route.ts` |

Marcatore "ruolo già scelto" = `user_metadata.role` (presente per le iscrizioni email, assente per
Google). Nessuna colonna nuova, nessun dato finto, nessun privilegio nuovo: `admin` resta
assegnabile solo via `settings.admin_email`.

## Rotte dopo la scelta del ruolo

- **Artista** → `/onboarding/artist` (nome, città, genere, Spotify) → `/events/new`
- **Locale** → home (l'onboarding venue arriva in Fase 2)
- **Fan** → home

## Definition of Done

- [x] Migration 0002 eseguita su Supabase.
- [x] Iscrizione Google → richiesta ruolo → `profiles.role` corretto in DB.
- [x] Iscrizione email → nessun passaggio extra (già scelto nel form).
- [x] Un fan può diventare artista in seguito; nessun utente può diventare `admin`.
- [x] `npm run build` senza errori + commit "Fase 1" e deploy verde.
