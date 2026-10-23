# OpenStage — Politica email e notifiche in-app

> **Approvata dal proprietario il 23 ottobre 2026.** Vale per la **7B**, la **Fase 8**,
> la **Fase 9** e tutte le funzioni che devono avvisare un utente. Se un piano dice
> qualcosa di diverso, vince questo documento.

## 1. Principio

Le email sono un **canale critico e costoso**, non il canale predefinito. La quota
Resend è limitata e va protetta: se finisce, smettono di funzionare anche conferma
account e reset password.

La regola è una sola:

> **Email solo per ciò che l'utente deve ricevere anche se non entra mai nel sito.
> Tutto il resto è una notifica in-app. Il digest settimanale è l'unica email non
> critica, ed è opt-in.**

Le notifiche in-app non sostituiscono mai:

- conferma dell'account;
- reset password;
- avvisi di sicurezza (cambio password, cambio email);
- ricevute di pagamento;
- risposta diretta a un messaggio di contatto.

## 2. Matrice dei canali

| Caso | Email | In-app | Note |
| --- | --- | --- | --- |
| Conferma account | **Sì, obbligatoria** | No | Senza email non esiste il flusso |
| Reset password / cambio password / cambio email | **Sì, obbligatoria** | Sì, come traccia | Sicurezza |
| Risposta al form contatti | **Sì, 1:1** | No | Chi scrive può non avere un account |
| Invito claim con token | **Sì se non ha account** | Sì se ha account | Il token serve per entrare |
| Evento annullato | **No di default** | **Sì, immediata** | + digest settimanale opzionale |
| Promemoria evento salvato | No di default | Sì | Email solo in digest opzionale |
| Nuovo evento di artista/locale seguito | No | Sì | Raggruppa: “3 nuovi eventi” |
| Profilo verificato / claim approvato o rifiutato | No | Sì | Basta la dashboard |
| Bozza pubblicata o rifiutata | No | Sì | Email solo se l'utente ha scelto il digest |
| Moderazione / sospensione | No | Sì | La decisione sta nell'account |
| Nuovo follower, salvataggio, visita profilo | **No** | **No** | Metriche di vanità: fuori |
| Ricevuta pagamento (Fase 11) | **Sì** | Sì | Obbligo legale/contabile |
| Digest settimanale | **Sì, opt-in** | Sì | Max 1 a settimana, solo se c'è qualcosa |
| Marketing / newsletter | No | No | Non è il modello di OpenStage |

### Caso “evento annullato” con 300 follower

- 300 righe in-app sono un costo trascurabile.
- 300 email consumano 300 crediti e occupano la coda per minuti.
- Quindi: **notifica in-app immediata** a chi ha salvato o segue; **digest settimanale**
  opzionale.
- Eccezione da valutare solo per cancellazioni a **meno di 24–48 ore** e solo per chi
  ha attivato “avvisi urgenti via email”. Default: spento.

## 3. Notifiche in-app

### 3.1 Tipi ammessi

- evento annullato o modificato;
- promemoria di un evento salvato;
- nuovi eventi di artisti/locali seguiti, raggruppati;
- claim, verifica e moderazione;
- messaggio importante dell'admin;
- sistema (manutenzione, sicurezza).

Non sono ammessi: “nuovo follower”, “qualcuno ha salvato”, “visualizzazioni”,
“complimenti per il traguardo”, notifiche di vanità.

### 3.2 UX

- **Campanella in navbar** per tutti gli utenti loggati, con badge unread reale.
- **Pagina notifiche** dentro l'area personale (`/dashboard/notifiche`), con:
  - filtro per tipo;
  - “segna tutte come lette”;
  - link diretto all'evento, alla scheda o all'account;
  - stato vuoto chiaro.
- **Mobile**: barra ruolo-specifica.
  - Non loggato: `Esplora · Mappa · Artisti · Locali · Accedi`.
  - Loggato: `Esplora · Notifiche · Artisti · Locali · Profilo`.
  - Admin: nessuna barra pubblica, c'è il guscio admin.
- La mappa **non sparisce dal prodotto**: resta raggiungibile da Esplora e da `/mappa`.
  Sostituirla nella barra dei loggati è una scelta di priorità, non una rimozione.

### 3.3 Dati

Tabella `notifications` (7B):

- `id`, `user_id`, `type`, `title`, `body`, `href`;
- `read_at`, `created_at`, `expires_at`;
- `dedupe_key` per non duplicare lo stesso avviso;
- `priority` (`critical`, `normal`, `low`);
- `metadata` JSONB solo se serve, senza dati sensibili.

Regole:

- RLS: l'utente legge e aggiorna solo le proprie notifiche; l'inserimento avviene
  solo lato server o con service role.
- Creazione in batch per eventi con molti follower; nessuna email automatica.
- Retention: 90 giorni, poi pulizia.
- Niente realtime nella prima versione: badge aggiornato al caricamento.
- Le notifiche critiche restano visibili anche se l'utente ha disattivato le
  preferenze non critiche.

## 4. Email: classi e quota

### 4.1 Classi

| Classe | Esempi | Priorità | Può essere bloccata dalla quota? |
| --- | --- | --- | --- |
| `auth` | conferma account, reset, sicurezza | massima | **No** |
| `transactional` | risposta contatti, ricevuta, invito | alta | No, salvo errore provider |
| `digest` | riepilogo settimanale | media | Sì |
| `optional` | avvisi non critici | bassa | Sì |

### 4.2 Regole Resend

- **Quota riservata**: una parte della quota giornaliera è riservata a `auth` e
  `transactional`. I digest non possono consumarla.
- **Tetto agli invii massivi**: prima di un invio > N destinatari, l'admin vede
  quanti crediti restano e deve confermare.
- **Dry run**: “questa operazione manda 300 email, ne restano 120” prima di partire.
- **Blocco automatico** oltre la soglia; il sistema propone in-app o digest.
- **Retry** solo dopo aver corretto l'errore, a lotti piccoli, con audit.
- **Nessun tracking** (open/click), nessun pixel, nessun link di marketing.
- **Nessun invio massivo sincrono**: la coda è della 7B.

### 4.3 Pannello Comunicazione (Fase 8)

Il pannello `Comunicazione` della control room mostra:

- quota Resend usata/rimanente;
- coda per classe e stato;
- falliti con errore pulito e retry controllato;
- dry run e conferma per gli invii massivi;
- log con `category`, `batch_id`, `recipient_count`, `status`;
- nessuna API key, nessun token, nessun errore grezzo del provider.

## 5. Preferenze

- In-app: attive per impostazione predefinita per le notifiche importanti.
- Email non critiche: **opt-in**.
- Digest: opt-in, massimo 1 a settimana.
- L'utente può disattivare le categorie non critiche senza perdere le notifiche
  di sicurezza.
- La disiscrizione senza login (7B) vale solo per le email non critiche.

## 6. Dove vive

| Fase | Cosa |
| --- | --- |
| **7A** | Solo email critiche/transazionali: conferma, reset, risposta contatti |
| **7B** | `notifications`, centro notifiche, preferenze, digest, classi e quota |
| **Fase 8** | Control room, pannello Comunicazione, audit, 2FA |
| **Fase 9** | I follow generano notifiche in-app, non email immediate |
| **Fase 10** | Le dashboard artista/locale mostrano le notifiche di ruolo |
| **Fase 13** | Eventuale push PWA, solo se il prodotto lo richiede |

## 7. Criterio di chiusura

- Una cancellazione con 300 follower crea 300 notifiche in-app e **zero** email
  immediate.
- Un utente non loggato non riceve notifiche in-app: per questo esistono le email
  critiche e il digest opzionale.
- La quota `auth` non viene mai consumata da un digest.
- Nessuna notifica di vanità è presente nel database.
