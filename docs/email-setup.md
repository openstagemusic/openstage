# Configurazione email — getopenstage.it

> Promemoria operativo della **Fase 7A**. Non contiene segreti: le API key restano fuori dal repository.

## Stato

- Dominio: **getopenstage.it**, acquistato su Aruba con bundle “Dominio con email”.
- Attivazione Aruba: **completata**; caselle `noreply@getopenstage.it` e `ciao@getopenstage.it` create.
- Resend: dominio **verificato** in `eu-west-1`; DNS DKIM/SPF/Return-Path attivi.
- Resend API key: **due chiavi create e salvate nel gestore password** (valori non nel repository):
  - `openstage-vercel` per app/Edge Function;
  - `openstage-supabase-smtp` per l’SMTP di Supabase Auth.
- Casella ufficiale: Aruba (5 caselle da 1 GB). Resend serve solo per l’invio.
- Supabase “Confirm email”: **attivo**; SMTP Resend configurato.
- Turnstile: **attivo lato Supabase** su registrazione, login e reset.

## Impostazioni Resend

- Dominio: `getopenstage.it` (root, non `send.getopenstage.it`)
- Region: `eu-west-1`
- Custom Return-Path: `send`
- Click tracking: disattivato
- Open tracking: disattivato
- Receiving: disattivato (la posta in arrivo resta su Aruba)

## Record DNS da aggiungere su Aruba

Inserire i nomi senza il dominio se il pannello Aruba li aggiunge automaticamente; altrimenti usare il nome completo.

| Tipo | Nome | Valore | TTL | Stato |
| --- | --- | --- | --- | --- |
| CNAME | `rsend` | `rsend-euw1.forge.rmta.net` | Auto | ✅ attivo |
| CNAME | `send` | `send.forge.rmta.net` | Auto | ✅ attivo |
| TXT | `_dmarc` | `v=DMARC1; p=none; adkim=r; aspf=r;` | Auto | ✅ attivo |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbl3pqasNhL8LUEPJyRDCIq1/xr9uL54N5cRkU0dDebqMUv8k6PndDGkZCSw206zS25KwdS0vLGy1viecYDrQOGZxMem2NU2LISlOP65q0Vqkt5h7QM8F/IfnR4XxsKXJU9F+0O7BaOjwns/SKsSP9cJL1oZ4bw6WwHzWZvjPN6wIDAQAB` | Auto | ✅ attivo |

> Il record DKIM è una chiave pubblica: può stare nel repository. Non è un segreto.

## Politica d'uso (approvata il 23 ottobre 2026)

- Email solo per **conferma account, reset password, sicurezza, ricevute, risposta 1:1
  e inviti con token**.
- Cancellazioni, follow, promemoria e moderazione sono **notifiche in-app**.
- Il digest settimanale è **opt-in**, massimo una email per utente a settimana.
- La quota Resend ha una **riserva per le email di autenticazione**: i digest non
  possono consumarla.
- Prima di un invio massivo: dry run, conteggio destinatari e conferma.
- Nessun tracking, nessun pixel, nessuna newsletter.

Dettagli completi: `docs/notifications-email-policy.md`.

## Template Supabase: conferma e reset senza dipendere dal browser

Per far funzionare i link anche quando Gmail li apre in un browser diverso da quello della
richiesta, **non usare `{{ .ConfirmationURL }}`**. Usa `{{ .TokenHash }}` e la route
`/auth/confirm`:

**Confirm signup**
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=signup&amp;next=/onboarding/role">
  Conferma il tuo account OpenStage
</a>
```

**Reset password**
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/reset-password">
  Reimposta la password di OpenStage
</a>
```

La route `/auth/confirm` verifica il token lato server, crea la sessione e reindirizza alla
pagina giusta. Funziona da Chrome, Opera, Safari o da un altro telefono, perché non usa il
`code_verifier` PKCE salvato nel browser di partenza.

## Note

- Non attivare “Receiving” in Resend: il MX principale del dominio deve restare quello di Aruba.
- DMARC parte in modalità monitoraggio (`p=none`); si potrà passare a `quarantine` dopo aver controllato i report.
- Le API key Resend non vanno salvate nel repository: andranno in `.env.local` e nelle variabili Vercel.
- Dopo la verifica: la API key `openstage-vercel` è quella usata dall’app; la `openstage-supabase-smtp` è configurata in Supabase Auth. Conferma email e reset password sono stati testati in produzione.
