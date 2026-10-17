# Review — Fase 3.2.1: correzione del reclamo (la prova dell'utente)

> Fatto il 17 ottobre 2026, dopo che la prova dell'utente ha bocciato la Fase 3.2: *"ho provato a
> reclamare l'artista con un utente fan e mi dice solo un profilo artista può reclamare; così sono
> diventato artista ma mi dice «amministri già una scheda artista»"* — e lo stesso per il locale.
> **43 prove sulle regole del database · 46 controlli in browser del giro completo, 0 falliti ·
> build verde.**

## Cosa era rotto (e di chi è la colpa)

La regola "un profilo, una scheda" è giusta, ma l'avevo aggiunta **senza collegarla al cambio di
ruolo**. Il percorso è questo:

1. un fan prova a reclamare → `Solo un profilo artista può reclamare` (giusto, ma secco: nessuno
   gli dice cosa fare);
2. il fan diventa artista → il passaggio lo porta su `/onboarding/artist`, che **crea subito una
   scheda nuova**;
3. ora ha una scheda sua (vuota) → reclamare quella vera dà `un profilo ne amministra una sola`.

**Vicolo cieco garantito**, e per giunta con l'aria di essere una regola del sito. Il difetto non
era nella regola ma nell'ordine: nel punto in cui si crea la scheda non c'era nessuno che dicesse
"la tua esiste già, reclamala".

Due difetti collegati, trovati dalla stessa prova:

- il piano della 3.2 prevedeva *"chi non ha il ruolo giusto viene guidato a sceglierlo"*: **non
  l'avevo fatto**;
- l'interfaccia diceva all'admin che poteva gestire le schede (`canManageArtistProfile`), il
  database lo rifiutava: **due verità in contraddizione**, lo stesso difetto che avevo appena
  eliminato cancellando `lib/auth.ts`.

Il messaggio letto in inglese è un effetto noto e non un difetto: in locale non c'è l'informazione
del paese di Vercel, quindi la lingua cade sull'inglese.

## Cosa ho cambiato

### Database (migration `0012_claim_ownership.sql`)

1. **`free_vacant_page(tipo, profilo, scheda_da_tenere)`**: se il profilo amministra **un'altra
   scheda senza eventi**, la elimina e restituisce `eliminata`; se quella scheda **ha eventi**
   restituisce `occupata` e non la tocca; se non ne ha altre, `nessuna`. La usano le tre funzioni
   di reclamo, così la regola è una sola.
   - **La scheda senza eventi si sostituisce, quella con eventi no.** Una scheda con eventi è
     lavoro vero (e chi la amministra non deve perderlo per un clic): lì decide l'admin.
   - **La verifica non blocca la sostituzione**: la verifica è del **profilo**, non della scheda.
     Un profilo verificato con una scheda vuota che ne prende un'altra resta verificato.
2. **L'admin può reclamare** (`role in ('artist','admin')` / `('venue','admin')`): era quello che
   l'interfaccia già gli prometteva.
3. **`decide_claim` usa la stessa regola**: approvando, se chi ha chiesto la scheda se n'è creata
   una vuota nel frattempo, quella viene eliminata; se ha eventi, l'approvazione si rifiuta con una
   spiegazione.

### Interfaccia

4. **Il ruolo non crea più la scheda.** `/onboarding/artist` e `/onboarding/venue` ora si aprono con
   **"La tua scheda è già su OpenStage?"**: si cerca il proprio nome tra le schede **reali**, si apre
   quella giusta e si reclama. Il modulo di creazione è la **seconda** strada, sotto
   (`PageSearch.tsx`). La ricerca è un normale invio `?q=`, quindi la pagina resta una Server
   Component e i risultati sono già nell'HTML.
5. **Chi ha il ruolo sbagliato viene guidato**: nuovo stato `wrongRole` nel pannello. Al **fan**
   spiega che serve un profilo Artista/Locale e gli dà il pulsante `Diventa artista` / `Diventa
   locale` (avvisando che il ruolo è definitivo); a chi ha già un altro ruolo spiega che i ruoli
   sono definitivi e serve un altro account. **Niente più frasi secche dal database.**
6. **Chi ha una scheda vuota può reclamare**: il pannello mostra il modulo con un avviso rosa che
   **nomina la scheda che verrà eliminata** («…»). Lo stato `amministri già una scheda` resta solo
   per le schede **con eventi**, l'unico caso in cui serve davvero l'amministratore.
7. **Il primo passo non rimanda più all'account chi ha una scheda vuota** (lo faceva, e chiudeva il
   cerchio del vicolo cieco): gli mostra la ricerca e il nome della scheda che ha già.

## Le trappole vere trovate (e risolte)

**1. Approvare un reclamo era rotto da un refuso: `p_note` invece di `p_nota`.** In `decide_claim`
l'aggiornamento della riga approvata usava un identificatore che non esiste. In plpgsql gli
identificatori si controllano **all'esecuzione**, non alla creazione: la funzione si era creata
senza errori e il guasto si vedeva solo premendo "Approva" su una richiesta di locale. Nessuno se
n'era accorto perché i reclami **artista** non passano da lì (si approvano da soli). L'ha trovato la
batteria di prove di questa correzione, e per un pelo non l'ho portato in produzione così: il primo
giro di prove l'ha segnalato con `42703: column "p_note" does not exist`.

**2. `revoke … from public` non basta: Supabase concede l'esecuzione per conto suo.** Alla prima
stesura avevo tolto l'esecuzione di `free_vacant_page` a `PUBLIC` — ma Supabase concede `execute`
ad `anon` e `authenticated` per impostazione predefinita su ogni nuova funzione in `public`. La
prova (`has_function_privilege`) l'ha smascherato subito: **chiunque collegato avrebbe potuto
eliminare le schede vuote altrui**, passando il proprio `p_profile_id` sbagliato… o meglio, il
proprio: la funzione prende il profilo come parametro, quindi un utente poteva cancellare la scheda
vuota di un altro. Corretto con `revoke … from public, anon, authenticated` (e verificato: solo le
funzioni di reclamo restano eseguibili da chi è collegato).

**3. Il riflesso "verificato = non si tocca" era sbagliato.** Nella prima stesura la scheda di un
profilo verificato non era sostituibile: ma la verifica è della **persona** (lo dice la stessa
3.2), quindi un verificato con una scheda vuota restava incastrato esattamente come il fan
dell'utente. Tolto: il paletto vero sono **gli eventi**.

## Prove fatte

**Database (43 controlli, transazione annullata, profili di prova isolati)**

- Ruolo sbagliato: fan → artista, locale → artista, artista → locale, link di prova vuoto (`42501`,
  `22023`).
- **Il caso dell'utente**: artista con scheda vuota reclama quello vera → la vuota è eliminata, la
  scheda è sua, resta un reclamo `approved` con la prova. La stessa cosa per un locale (richiesta
  `pending` → approvazione → scheda assegnata, profilo verificato, scheda vuota eliminata).
- Scheda **con eventi**: reclamo rifiutato e scheda intatta; approvazione rifiutata e richiesta
  ancora in attesa.
- Admin: può reclamare artista e locale; non può prendere una scheda già presa.
- Profilo **verificato** con scheda vuota: può cambiare scheda e resta verificato.
- Regressioni: revoca (la scheda torna a OpenStage, la verifica resta), doppio reclamo, trigger
  delle bozze, richieste concorrenti chiuse da sole.
- Sicurezza: `free_vacant_page` **non** eseguibile da `anon` né da `authenticated`; `claim_artist` e
  `verified_profile_ids` sì.

**Browser (46 controlli su build di produzione, `next start`, con account veri di prova)**

1. Visitatore anonimo: invito ad accedere, nessun invito a cambiare ruolo, etichetta "Non
   reclamato".
2. Fan: avviso + pulsante corretto su artista e locale (anche su una scheda vera, `druso`), nessun
   modulo di reclamo, primo passo artista/locale → scelta del ruolo.
3. Artista con scheda vuota: primo passo con la ricerca in cima, nessun modulo di creazione, nome
   della scheda che ha già; ricerca che trova la scheda vera e porta ad aprirla; ricerca vuota che
   lo dice; pannello con l'avviso di eliminazione; **reclamo eseguito davvero** → la scheda diventa
   sua e ogni invito sparisce.
4. Locale con scheda vuota: stesso giro, richiesta inviata, stato "in attesa" al ritorno.
5. Coda admin: la richiesta è in elenco, **"Approva" funziona** (era il punto rotto dal refuso), il
   profilo risulta verificato, la scheda mostra il badge "Verificato", e chi non è admin riceve il
   404.

## Verifica finale dei dati di produzione

Dopo le prove: `0` reclami, `0` bozze, `0` profili verificati, nessun account di prova, nessuna
scheda di prova. Restano i dati veri: 4 profili, 6 schede artista (comprese `fff`, `weee`, `yagsg`
degli utenti veri), il locale `druso`, 3 eventi pubblicati, `settings.admin_email` ripristinato.

## Cosa resta aperto (annotato nel backlog)

- **B29**: la ricerca c'è, ma **dopo** aver scritto il nome, non *mentre* lo si scrive. Il passo
  successivo è proporre "è già la tua? reclamala" con i suggerimenti già esistenti.
- **B31** (nuovo): l'amministratore non può **staccare** una scheda creata senza reclamo (una
  scheda creata dal primo passo non ha una riga in `claims`, e la revoca lavora solo sui reclami).
  Ora serve solo per le schede **con eventi**: le vuote si sostituiscono da sole.
- **B30** resta valido: `/account` non dice che c'è una richiesta in attesa.

## Rischi

- **La scheda vuota viene eliminata davvero.** È voluto e concordato, l'avviso nomina la scheda
  prima, e la regola è stretta: **zero eventi**. Se un giorno si vorrà conservare anche le schede
  vuote, il punto di modifica è uno solo (`free_vacant_page`).
- **La regola "senza eventi" è scritta due volte**: nel database (che decide) e nella lettura di
  cortesia (`getReplaceablePage`, che la anticipa all'utente). Se le due divergessero, comanda il
  database e l'utente vede un errore chiaro invece di un pulsante che finge.
- **Admin e ruolo**: la funzione accetta il ruolo `admin`, che è quello del profilo dell'admin
  vero. Se un giorno `settings.admin_email` puntasse a un profilo con un altro ruolo,
  l'amministratore vedrebbe la coda ma non il pannello di reclamo (l'interfaccia guarda il ruolo).
  Da tenere presente quando l'admin diventerà una cosa più strutturata.
