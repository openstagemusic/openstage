# Fase 7B — Email Engine, Area Fan e notifiche in-app

> **Stato: 7B.1, 7B.2 e 7B.3a completate; restano digest e Area Fan (7B.3b/7B.3c).**
> La 7B è troppo grande per un solo blocco: si divide in tre parti indipendenti,
> ognuna con build e QA. La politica di riferimento resta
> `docs/notifications-email-policy.md`.

## Ordine consigliato

### 7B.1 — Centro notifiche in-app (prima)

- Tabella `notifications` con RLS: ogni utente legge e aggiorna solo le proprie.
- Notifica automatica quando un evento salvato viene annullato.
- Campanella in navbar con badge reale.
- Pagina `/dashboard/notifiche` con filtro per tipo, “segna tutte come lette”,
  link all'evento e stato vuoto.
- Barra mobile loggata: `Esplora · Notifiche · Artisti · Locali · Profilo`.
- Nessuna email automatica: le cancellazioni restano in-app.
- Nessun servizio nuovo, nessuna variabile nuova.

### 7B.2 — Coda email, webhook e quota

- `email_queue` / `email_log`, worker con `pg_cron` + Edge Function, retry,
  idempotency key, tetto invii.
- Webhook Resend e classi `auth`, `transactional`, `digest`, `optional`.
- Riserva quota per auth/sicurezza; dry run e blocco sopra soglia.
- Solo dopo la 7B.1.

### 7B.3 — Preferenze, digest e Area Fan

- Preferenze in-app/email, digest settimanale opt-in, disiscrizione senza login.
- Area Fan: Per te, Promemoria, Impostazioni, centro notifiche.
- Follow e promemoria (Fase 9) generano notifiche in-app, non email immediate.

## File previsti per 7B.1

- `supabase/migrations/0030_notifications.sql`
- `lib/notifications/queries.ts`
- `app/actions/notifications.ts`
- `app/dashboard/notifiche/page.tsx`
- `components/notifications/NotificationList.tsx`
- `components/layout/Navbar.tsx`
- `components/layout/MobileTabBar.tsx`
- `app/layout.tsx`
- `app/dashboard/layout.tsx`
- `i18n/dictionaries/it.ts`
- `i18n/dictionaries/en.ts`

## QA 7B.1

- [ ] Annullare un evento salvato crea una notifica per chi lo aveva salvato.
- [ ] L'autore dell'evento non riceve la notifica della propria cancellazione.
- [ ] La stessa notifica non viene duplicata.
- [ ] Badge e pagina mostrano solo notifiche proprie.
- [ ] “Segna tutte come lette” azzera il badge.
- [ ] La barra mobile loggata mostra Notifiche al posto di Mappa.
- [ ] Italiano e inglese; 320, 390, 768 e 1280 px.
- [ ] `npm run build` verde.
- [ ] Nessuna email automatica e nessun servizio nuovo.

## Criterio di chiusura 7B.1

Cancellazione evento con utenti che l'hanno salvato → notifiche in-app, zero email,
badge e centro notifiche funzionanti; build verde e commit **“Fase 7B.1”**.
