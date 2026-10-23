# Fase 7A — Email reale, conferma account, reset password e risposta ai messaggi

> **Stato: piano da approvare.** Scritto il 23 ottobre 2026.
> La Fase 7 è divisa in due blocchi. Questo documento copre **solo la 7A**:
> infrastruttura di invio, conferma email, reset password e risposta integrata
> ai messaggi di contatto. Coda, worker, webhook, preferenze e Area Fan restano
> nella **7B**.
>
> Nessun codice verrà scritto prima dell'ok al piano e della verifica del
> dominio `getopenstage.it`.
>
> La politica dei canali approvata il 23 ottobre 2026 è in
> **`docs/notifications-email-policy.md`**: la 7A resta alle email critiche e
> transazionali; la 7B aggiunge coda, notifiche in-app, digest e quota protetta.

## Rapporto con la Fase 5.5

La **5.5A** (login, registrazione, account e onboarding) è il blocco visivo che
precede la 7A. La 7A non ridisegna quelle pagine: aggiunge conferma email, reset
password e i messaggi di stato. Se la 5.5A non è ancora pronta, la 7A tocca solo
copy e flussi, senza mescolare restyling e logica nella stessa modifica.

La **5.5D** (guscio dashboard) precede la 7B, così l'Area Fan nasce dentro un
guscio già coerente. I moduli funzionali artista/locale restano nella Fase 10.

## Perché prima la 7A

Le email non sono un accessorio grafico: sono un **cancello di fiducia**.

Senza conferma email chiunque può registrarsi con l'indirizzo di un'altra
persona e, quando il proprietario vero entra con Google, Supabase può unire le
identità e lasciare la password scelta da chi si è registrato prima. È il
*pre-account takeover* descritto in **B35**. Senza reset password, invece, chi
perde la password è fuori per sempre e chi nasce con Google non può impostarne
una (**B36**). La risposta ai messaggi (**B48**) chiude un altro vicolo cieco:
oggi `mailto:` funziona solo se il computer ha un client di posta configurato.

La 7A è quindi il blocco minimo che rende OpenStage **affidabile**, non
"più bello". Resta coerente con i principi: nessun paywall, nessun tracking,
nessuna email di marketing, nessun dato finto.

## Cosa entra nella 7A

### 7A.1 — Infrastruttura di invio reale

- Resend con dominio **`getopenstage.it`** verificato.
- Mittente transazionale: `OpenStage <noreply@getopenstage.it>`.
- Risposte umane: `ciao@getopenstage.it`.
- SMTP di Supabase Auth verso Resend.
- `lib/email/` come unico punto di invio dell'app:
  - configurazione letta da ambiente;
  - chiamata a Resend via `fetch`, senza nuova dipendenza npm;
  - timeout, errori tipizzati e nessun falso successo;
  - nessuna API key o corpo email nei log.
- `.env.example` aggiornato con le variabili della 7A.
- Invio **sincrono**: la coda arriva nella 7B. Se Resend non risponde, l'azione
  lo dice e non finge che l'email sia partita.

### 7A.2 — Conferma email (B35, B08)

- Attivare **Confirm email** in Supabase solo dopo che SMTP e dominio sono
  verificati e testati.
- Aggiornare la registrazione:
  - `emailRedirectTo` verso `/auth/callback` con `next` e lingua;
  - dopo la conferma, artista e locale tornano al proprio onboarding, il fan
    alla propria area;
  - messaggio "controlla la tua email" già presente, con possibilità di
    **rinviare la conferma** senza creare un secondo account;
  - se l'email esiste già, resta il comportamento attuale che non promette
    un'email che non arriverà.
- Aggiornare il login:
  - il caso "email non confermata" spiega cosa fare e offre il reinvio;
  - nessun bypass della conferma lato applicazione.
- Rendere sicuro il callback:
  - accettare solo `next` interni (niente redirect aperti);
  - conservare la lingua passata dall'email, con fallback su cookie/paese;
  - errore link scaduto o già usato con messaggio chiaro e via di rientro.
- Template Supabase di conferma in italiano e inglese, senza immagini remote e
  senza tracking.

### 7A.3 — Password dimenticata e password per gli account Google (B36)

- Link **"Password dimenticata?"** nella pagina di accesso.
- Pagina **`/auth/reset`**:
  - senza sessione: modulo per richiedere il link;
  - con sessione valida (ritorno dal link): modulo per impostare la nuova
    password;
  - errore link scaduto con possibilità di richiederne un altro.
- Richiesta di reset:
  - `supabase.auth.resetPasswordForEmail` con redirect al callback;
  - risposta **sempre generica**, per non rivelare se un indirizzo è iscritto;
  - Turnstile se la site key è configurata;
  - rate limit e messaggio "troppi tentativi" già previsti.
- Nuova password:
  - minimo 8 caratteri, conferma, `updateUser({ password })`;
  - dopo il cambio, chiusura delle altre sessioni;
  - ritorno all'account con conferma visibile.
- In **`/account`**:
  - per chi ha solo Google: **"Imposta una password"**;
  - per chi ha già una password: **"Cambia password"**;
  - nessuna password scritta o mostrata nei log.
- Nessun invio di password via email: l'email contiene solo il link monouso.

### 7A.4 — Risposta integrata ai messaggi (B48)

- Sostituire il pulsante `mailto:` in `/admin/messaggi` con un pannello di
  risposta:
  - destinatario letto dal messaggio, mai digitato a mano;
  - oggetto precompilato `Re: OpenStage — <argomento>`;
  - corpo modificabile, con saluto nella lingua del messaggio;
  - invio reale da `noreply@`, con `reply-to: ciao@`;
  - fallback **"Copia indirizzo"** per chi vuole rispondere da fuori.
- Server action protetta:
  - solo admin;
  - validazione di ID, oggetto e testo;
  - escaping HTML;
  - nessun invio se il messaggio non esiste;
  - se l'invio fallisce, il messaggio **non** viene segnato come chiuso.
- Dopo un invio riuscito:
  - stato `closed`, `read_at` se mancava, `closed_at` e `replied_at`;
  - data della risposta visibile in coda;
  - refresh della lista.
- Testo email semplice, leggibile, senza immagini remote, pixel o link di
  tracciamento. Non è una newsletter.

### 7A.5 — Template e lingua

- Email applicative (risposta ai messaggi): template scelto dalla lingua del
  messaggio (`it`/`en`).
- Email di autenticazione (conferma e reset): per la 7A si usa un template
  **bilingue compatto** (italiano primo, inglese subito dopo). La
  localizzazione condizionale dei template Supabase si valuterà nella 7B, quando
  ci sarà il motore template completo.
- Testi dell'interfaccia nuovi in `i18n/dictionaries/it.ts` e `en.ts`, non
  hardcodati nei componenti.
- Nessun contenuto inventato: solo istruzioni reali su cosa fare e dove.

## Cosa non entra nella 7A

Restano nella **7B**, come da roadmap:

- `email_queue` e `email_log`;
- worker `pg_cron` + Edge Function, tetto 2 invii/sec, retry e backoff;
- webhook Resend per consegnate, rimbalzate e spam;
- preferenze email, tetto settimanale e disiscrizione senza login;
- Area Fan (Per te, Promemoria, Impostazioni, **centro notifiche**);
- tabella `notifications`, badge in navbar, pagina notifiche e preferenze in-app;
- **digest settimanale opt-in** (una email per utente, non una per evento);
- classi email `auth`, `transactional`, `digest`, `optional` e **quota riservata**
  alle email di autenticazione;
- notifica in-app a chi ha salvato una serata annullata (**B43**), senza 300 email;
- rifiuto delle bozze con notifica in-app (**B26**); email solo digest opt-in;
- esito del claim in-app; email solo per l'invito con token a chi non ha account
  (**B28**).

Non entra nemmeno:

- newsletter o email di marketing;
- open/click tracking;
- nuove dipendenze npm;
- Framer Motion;
- modifiche al manuale PDF (solo su richiesta esplicita).

## Servizi esterni e configurazione

Nessun servizio nuovo oltre a quelli già scelti. Il lavoro manuale è la parte
più delicata: va fatto nell'ordine giusto, altrimenti le email non arrivano o
finiscono in spam.

### Aruba — dominio e caselle

- Attendere l'attivazione di `getopenstage.it`.
- Aggiungere i record DNS di Resend indicati in `docs/email-setup.md`:
  - CNAME `rsend`;
  - CNAME `send`;
  - TXT `_dmarc`;
  - TXT `resend._domainkey`.
- Non attivare "Receiving" in Resend: il MX principale resta su Aruba.
- Creare/attivare almeno `ciao@getopenstage.it` per le risposte.
- `noreply@getopenstage.it` può essere solo mittente; non deve ricevere.
- Collegare il dominio a Vercel (A/CNAME) prima di usare link di produzione
  basati su `https://getopenstage.it`.

### Resend

- Verificare il dominio dopo la propagazione DNS.
- Usare le due API key già create:
  - `openstage-vercel` per l'app;
  - `openstage-supabase-smtp` per Supabase Auth.
- Tracking disattivato, regione `eu-west-1`, Return-Path `send`.
- Controllare il limite del piano free e non usarlo per test di massa.

### Supabase Auth

In **Authentication → SMTP**:

- Host: `smtp.resend.com`
- Porta: `465`
- Utente: `resend`
- Password: la API key `openstage-supabase-smtp`
- Mittente: `OpenStage <noreply@getopenstage.it>`

In **Authentication → URL Configuration**:

- Site URL produzione: `https://getopenstage.it`
- Redirect URLs:
  - `https://getopenstage.it/auth/callback**`
  - `http://localhost:3000/auth/callback**`
  - `https://openstage-alpha.vercel.app/auth/callback**` finché il dominio non
    è collegato (da rimuovere dopo il passaggio).

Poi:

- personalizzare i template **Confirm signup** e **Reset password**;
- testare un invio reale;
- solo dopo attivare **Confirm email**;
- verificare che gli account esistenti restino accessibili e che chi ha solo
  Google possa impostare una password.

### Vercel

Aggiungere in Production, Preview e Development:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `NEXT_PUBLIC_SITE_URL`

`NEXT_PUBLIC_SITE_URL` deve essere:

- `http://localhost:3000` in locale;
- `https://getopenstage.it` in produzione, quando il dominio è collegato;
- l'indirizzo Vercel attuale solo come ponte finché il dominio non risponde.

## Variabili d'ambiente della 7A

| Variabile | Dove | Note |
| --- | --- | --- |
| `RESEND_API_KEY` | server / Vercel | Solo server. Mai `NEXT_PUBLIC_`. |
| `EMAIL_FROM` | server / Vercel | `OpenStage <noreply@getopenstage.it>` |
| `EMAIL_REPLY_TO` | server / Vercel | `ciao@getopenstage.it` |
| `NEXT_PUBLIC_SITE_URL` | pubblico | Serve ai link di conferma e reset. |

Le credenziali SMTP di Supabase **non** vanno in `.env.local`: si configurano
solo nella dashboard Supabase.

`RESEND_WEBHOOK_SECRET`, `UNSUBSCRIBE_SECRET` e `EMAIL_WORKER_SECRET` sono
variabili della 7B e non vengono introdotte ora.

## Database e SQL

Una sola migration nuova, `0029_contact_message_replies.sql`:

```sql
alter table public.contact_messages
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid references public.profiles(id) on delete set null;

-- Il modulo pubblico non deve poter simulare una risposta già inviata.
drop policy if exists contact_messages_insert_public on public.contact_messages;
create policy contact_messages_insert_public on public.contact_messages
  for insert to anon, authenticated
  with check (
    status = 'new'
    and read_at is null
    and closed_at is null
    and replied_at is null
    and replied_by is null
  );

comment on column public.contact_messages.replied_at is
  'Ultima risposta inviata dall''admin, se presente.';
comment on column public.contact_messages.replied_by is
  'Admin che ha inviato l''ultima risposta.';
```

La RLS di lettura e aggiornamento resta quella di `0028`: solo admin. Non
servono nuove tabelle, non si toccano i dati esistenti e non si crea nessun
dato finto.

Aggiornare di conseguenza:

- `lib/messages/queries.ts` (`repliedAt`, `repliedBy` nel tipo e nella select);
- `components/admin/AdminMessagesPanel.tsx` (data della risposta);
- `app/actions/messages.ts` (action di risposta e aggiornamento stato).

## Flussi dettagliati

### Registrazione con conferma

1. L'utente compila il modulo; `signUp` riceve anche `locale` nei metadati.
2. `emailRedirectTo` contiene `next` (onboarding del ruolo o area fan) e
   `locale`.
3. Supabase invia l'email tramite Resend SMTP.
4. L'utente apre il link: `/auth/callback` scambia il codice, valida `next`,
   sceglie la lingua e reindirizza.
5. Se il link è scaduto o già usato, l'utente vede un errore e può chiedere un
   nuovo invio.
6. Finché non conferma, il login spiega il blocco e offre il reinvio.

### Reset password

1. Da `/login` si apre `/auth/reset`.
2. Senza sessione, l'utente inserisce l'email; la risposta è sempre generica.
3. Supabase invia il link; il link torna a `/auth/callback` con
   `next=/auth/reset`.
4. Il callback crea la sessione di recupero e porta al modulo di nuova password.
5. L'utente imposta la password; le altre sessioni vengono chiuse.
6. Torna all'account con una conferma. La vecchia password non funziona più.

### Account nato con Google

1. In `/account` il profilo non ha un'identità email/password.
2. Vede "Imposta una password".
3. `updateUser({ password })` aggiunge la password all'account già esistente.
4. Da quel momento può accedere sia con Google sia con email e password, senza
   creare un secondo account.

### Risposta a un messaggio

1. L'admin apre `/admin/messaggi` e sceglie "Rispondi".
2. Il modulo propone oggetto e saluto nella lingua del messaggio.
3. L'admin modifica il testo e invia.
4. La server action verifica il ruolo, valida i campi, chiama `sendEmail` con
   `reply_to: ciao@`.
5. Se Resend accetta, aggiorna `contact_messages`; altrimenti restituisce un
   errore e non chiude il messaggio.
6. La coda mostra "Risposto il …" e lo stato aggiornato.

## File previsti

- `docs/plan-fase-7.md` (questo piano)
- `docs/email-setup.md` (promemoria DNS già creato)
- `.env.example`
- `lib/email/config.ts`
- `lib/email/send.ts`
- `lib/email/templates/contact-reply.ts`
- `app/actions/messages.ts`
- `app/auth/callback/route.ts`
- `app/auth/reset/page.tsx`
- `components/auth/ResetRequestForm.tsx`
- `components/auth/ResetPasswordForm.tsx`
- `components/account/PasswordPanel.tsx`
- `components/auth/LoginForm.tsx`
- `components/auth/RegisterForm.tsx`
- `components/admin/AdminMessagesPanel.tsx`
- `lib/messages/queries.ts`
- `lib/supabase/session.ts` (solo se serve `hasPassword`)
- `app/account/page.tsx`
- `i18n/dictionaries/it.ts`
- `i18n/dictionaries/en.ts`
- `supabase/migrations/0029_contact_message_replies.sql`

Nessuna modifica non necessaria, nessun refactoring extra.

## Design

- Form in linea con il sistema esistente: pannelli glass, bordi netti, etichette
  chiare, focus visibile.
- Mobile first; niente overflow a 320 px.
- Messaggi di successo/errore in italiano e inglese, senza toni allarmistici.
- Email semplici e leggibili anche senza immagini: header testuale, corpo
  chiaro, link monouso, footer con il nome OpenStage.
- Niente animazioni o dipendenze nuove per queste pagine.

## Ordine di lavoro

0. **5.5A completata se possibile** (login, registrazione, account, onboarding):
   la 7A non ridisegna queste pagine. Se Aruba si sblocca prima, la 7A passa
   davanti e la 5.5A riprende dopo.
1. Verifica manuale: dominio, DNS, Resend, SMTP Supabase, template, URL.
2. Aggiornare `.env.example` e la configurazione locale.
3. Creare `lib/email` e il template di risposta ai messaggi.
4. Migration `0029` e aggiornamento query/tipi.
5. Action di risposta e pannello in `/admin/messaggi`.
6. Flusso conferma email: registrazione, callback, reinvio, login.
7. Flusso reset password: `/auth/reset`, callback, account, Google.
8. Testi it/en e QA.
9. Build, deploy, test in produzione, commit **"Fase 7A"**.

## QA

### Infrastruttura

- [ ] Resend mostra il dominio `getopenstage.it` verificato.
- [ ] SPF, DKIM e DMARC sono presenti e corretti.
- [ ] Un invio di prova arriva da `noreply@getopenstage.it`.
- [ ] Una risposta a quell'email arriva a `ciao@getopenstage.it`.
- [ ] Il MX principale del dominio è ancora quello di Aruba.
- [ ] `RESEND_API_KEY` non compare nel bundle client né nei log.

### Conferma email

- [ ] Nuova registrazione fan: email ricevuta, link valido, accesso riuscito.
- [ ] Nuova registrazione artista/locale: dopo la conferma si arriva
      all'onboarding giusto.
- [ ] Link scaduto o già usato: errore chiaro e possibilità di reinvio.
- [ ] Reinvio conferma senza creare un secondo account.
- [ ] Email già registrata: nessuna promessa di email che non arriverà.
- [ ] Login con email non confermata: blocco spiegato e reinvio disponibile.
- [ ] Account Google: accesso invariato, nessuna unione indesiderata.

### Reset password

- [ ] "Password dimenticata?" visibile nel login.
- [ ] Email inesistente: risposta generica, nessuna fuga di informazioni.
- [ ] Email reale: link ricevuto e funzionante.
- [ ] Nuova password valida: accesso con la nuova, vecchia password rifiutata.
- [ ] Link scaduto/riusato: errore e nuovo invio.
- [ ] Account Google: "Imposta una password" e accesso con entrambi i metodi.
- [ ] Altre sessioni chiuse dopo il cambio password.
- [ ] Turnstile e rate limit non bloccano un utente normale.

### Risposta ai messaggi

- [ ] Non-admin non può inviare (action e RLS).
- [ ] L'email arriva al destinatario giusto, da `noreply@`, con `reply-to` `ciao@`.
- [ ] Oggetto e corpo con caratteri speciali non rompono l'HTML.
- [ ] Dopo l'invio: `closed_at` e `replied_at` valorizzati, stato chiuso.
- [ ] Se Resend fallisce, il messaggio resta aperto e l'errore è visibile.
- [ ] "Copia indirizzo" funziona senza client di posta.
- [ ] Nessun `mailto:` residuo nella coda.

### Generale

- [ ] Italiano e inglese su tutte le pagine nuove.
- [ ] 320, 390 e 1280 px senza overflow.
- [ ] `npm run build` verde.
- [ ] Test reale in produzione su Vercel dopo il push.
- [ ] Nessun dato finto, nessuna email simulata.

## Rischi e mitigazioni

| Rischio | Mitigazione |
| --- | --- |
| DNS non propagati o record sbagliati | Verifica con Resend e con un controllo DNS; non attivare Confirm email prima |
| Conflitto MX tra Aruba e Resend | Resend in invio, Receiving spento, MX root su Aruba |
| Email in spam | Dominio verificato, SPF/DKIM/DMARC, mittente coerente, niente tracking |
| Link di conferma/reset rotti | Test reali su più caselle, redirect allowlist, gestione link scaduti |
| Reset usato per enumerare account | Risposta sempre generica e rate limit |
| Pre-account takeover | Confirm email attivo prima dell'apertura pubblica; test account Google |
| Invio riuscito ma database non aggiornato | Errore esplicito all'admin; la 7B aggiungerà il log e il retry |
| API key esposta | Solo server, `.env.local` ignorato, nessun log, rotazione separata |
| Fase troppo grande | 7A chiude solo infrastruttura + tre flussi; il resto è 7B |

## Cosa serve da te per partire

1. **5.5A completata** (o almeno approvata e pianificata): la 7A non deve
   mescolare restyling e logica.
2. Aruba attiva e casella `ciao@getopenstage.it` funzionante.
3. Record DNS di Resend aggiunti e dominio verificato.
4. SMTP Supabase configurato con `openstage-supabase-smtp`.
5. `RESEND_API_KEY` di `openstage-vercel` in `.env.local` e su Vercel.
6. Conferma del mittente `noreply@` e del reply-to `ciao@`.
7. Conferma che `/auth/reset` va bene come indirizzo pubblico del reset.
8. Ok al piano e alle due scelte tecniche:
   - invio sincrono in 7A, coda in 7B;
   - template auth bilingue compatto in 7A, localizzazione condizionale in 7B.

## Criterio di chiusura

La 7A è chiusa quando:

- il dominio è verificato e le email partono davvero da `noreply@getopenstage.it`;
- la conferma email è attiva e una registrazione reale funziona dall'inizio alla
  fine;
- il reset password funziona per un account email e per un account Google;
- l'admin risponde a un messaggio reale dalla coda, senza `mailto:`;
- build e produzione sono verdi;
- esiste il commit **"Fase 7A"**.

La 7B parte solo dopo, con coda, worker, webhook, preferenze e Area Fan.
