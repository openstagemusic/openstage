# Revisione Fase 3.2.4 — "Iscriviti con Google" e i messaggi dell'accesso

> Blocco di rifinitura nato da una domanda dell'utente il 18 ottobre 2026, dopo la 3.2.3.
> Nessuna migration, nessun cambio di comportamento: **messaggi** e **due voci di backlog**.

## 1. La domanda dell'utente

> "Se faccio registrati e metto una mail già presente mi dice giustamente mail già registrata. Se
> invece faccio la registrazione tramite Google con una mail già registrata mi fa partire il login
> direttamente. È giusto? Lo lasciamo così? Ci dà problemi secondo te?"

## 2. Risposta breve

**Sì, è giusto e va lasciato così.** È la regola standard di Supabase (*Identity Linking — automatic
linking*): quando un'identità entra con un'email che esiste già, le identità vengono **unite** allo
stesso account invece di crearne un secondo. Quindi "Continua con Google" significa *entra se ci sei,
altrimenti crea*: è esattamente quello che uno si aspetta da quel pulsante. La registrazione con
email e password invece rifiuta, perché una email = un account: due profili con la stessa email
sarebbero due schede in conflitto.

Entrare con Google **non** è una via per entrare nell'account altrui: servirebbe possedere l'account
Google, e non si può falsificare. Il rischio sta nella direzione opposta (vedi §4).

## 3. Verifiche fatte sui dati veri

| Verifica | Esito |
| --- | --- |
| Quanti account, e con quale via d'accesso? | **4**, tutti e quattro **solo Google** (nessuno con password) |
| Account con **due** vie d'accesso (identità unite)? | **0** |
| Email confermate / senza conferma | 4 / 0 |
| Iscrizione con email nuova (`POST /auth/v1/signup`) | `200` **con sessione immediata** e `email_confirmed_at` valorizzato |
| Iscrizione **due volte** con la stessa email | `422` `user_already_exists` — *"User already registered"* (in inglese) |
| Impostazioni pubbliche di Auth (`/auth/v1/settings`) | **`mailer_autoconfirm = true`** → la conferma dell'email è **disattivata** |

L'utente di prova creato per la seconda riga è stato eliminato subito dopo: nessun residuo.

## 4. La cosa che non andava (B35)

Con la conferma dell'email **disattivata**, la documentazione Supabase descrive il *pre-account
takeover*:

1. un estraneo si iscrive con email e password usando **l'email di un altro** — non deve dimostrare
   di possederla, e l'email risulta confermata subito;
2. il proprietario vero, più tardi, entra con Google: Supabase unisce le identità allo stesso account;
3. l'estraneo **conserva la password che ha scelto**, quindi ha accesso all'account del proprietario.

Oggi l'impatto è basso (4 account, tutti dell'utente; nessun pagamento, nessun dato sensibile), ma
con PayPal e i pagamenti diventa grave. Il rimedio è **accendere "Confirm email"** in Supabase
(Authentication → Sign In / Up → Email), da fare **insieme a Resend**: senza un servizio email le
conferme non arrivano, quindi accenderlo adesso romperebbe le registrazioni vere. Voce **B35** nel
backlog, con la nota "prima di aprire al pubblico".

## 5. Cosa è cambiato

| File | Cambiamento |
| --- | --- |
| `lib/auth/error-messages.ts` | **Nuovo**: traduce i messaggi di Supabase Auth che un utente incontra davvero (email già registrata, credenziali errate, email da confermare, troppi tentativi, verifica anti-bot). Tutto il resto resta in inglese, com'è: meglio un messaggio tecnico che un messaggio sbagliato |
| `components/auth/RegisterForm.tsx` | Usa il traduttore. E, quando l'email esiste già, Supabase risponde **senza errore e senza sessione** per non rivelare chi è iscritto: ora quel caso viene riconosciuto (nessuna identità collegata) e non si dice più "controlla la tua email" a chi aspetta un'email che non arriverà |
| `components/auth/LoginForm.tsx` | Usa il traduttore: "Email o password non corretti. Se ti sei iscritto con Google, usa «Continua con Google»" |
| `i18n/dictionaries/it.ts`, `en.ts` | Nuovo gruppo `auth.errors` (5 testi per lingua) |

**Nessuna modifica** al comportamento di Supabase, al database, alle pagine o agli altri moduli.

## 6. Prove

**In browser** (build di produzione locale con la chiave di prova di Turnstile, sessione vera):
registrazione con un'email già iscritta → messaggio in italiano; accesso con password sbagliata →
messaggio in italiano con l'invito a usare Google; accesso corretto → si entra. Console pulita.

## 7. Cosa resta da fare (backlog)

- **B35** — conferma dell'email da accendere insieme a Resend (*pre-account takeover*).
- **B36** — manca il flusso **"password dimenticata"**: chi ha un account nato con Google non ha
  nessuna password e non può impostarla, e chi dimentica quella di un account email è fuori per
  sempre. Oggi l'unica via di rientro è il pulsante "Continua con Google".
