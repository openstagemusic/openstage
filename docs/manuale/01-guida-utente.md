# Che cos'è OpenStage

OpenStage è una piattaforma per **scoprire concerti dal vivo**, pensata per dare visibilità
reale agli **artisti indipendenti** e ai **locali di zona** che non possono permettersi le
grandi piattaforme commerciali.

I quattro principi che guidano ogni decisione (anche tecnica) sono:

| Principio | Cosa significa in pratica |
| --- | --- |
| **Underground e indipendente** | Gli artisti emergenti e i piccoli locali sono i protagonisti, non un contorno |
| **Gratis per sempre** | Nessun paywall per fan, artisti e locali nel piano base, nessun "pay-to-play" |
| **Autenticità** | Eventi reali, luoghi reali: niente metriche inventate o engagement finto |
| **UX senza attrito** | Trovare il concerto di stasera dev'essere facile come aprire una mappa |

> **Stato attuale.** Il progetto è in costruzione per fasi. Questo manuale documenta tutto ciò
> che è **realmente online e funzionante** alla versione indicata in copertina: quando una
> funzione è ancora un abbozzo, è scritto chiaramente.

## A che punto siamo

**Fatto e online:** identità e accesso (email e Google), **conferma email reale**, **recupero
password**, **Turnstile verificato lato server**, ruoli con regole definitive, design system,
doppia lingua IT/EN con indirizzi `/it` e `/en`, **directory reali di artisti e locali** con
filtri e schede pubbliche, **reclamo della scheda**, **dashboard** per artisti e locali,
**editor degli eventi** con bozze e locandine, **mappa interattiva** con pin e globo,
**pagine evento** con calendario e condivisione, **ricerca con suggerimenti**, **filtri
rapidi**, **pagina dei preferiti**, **segnalazioni e moderazione**, **Home poster wall** con
**sezione Città**, **pagine pubbliche reali** (Chi siamo, Per gli artisti, Per le venue,
Contatti, FAQ), **indice e pagine città**, **modulo contatti che scrive nel database** con
coda messaggi per lo staff, database con sicurezza a livello di riga, deploy continuo.

**In arrivo nelle prossime fasi:** community e "segui", Spotify, pagamenti opzionali, testi
legali definitivi e rifiniture SEO. La risposta integrata ai messaggi di contatto (`B48`)
resta l'ultimo pezzo della 7A.

**Da sapere oggi:** gli eventi presenti sono **reali**. Possono essere inseriti dalla
redazione oppure pubblicati direttamente da artisti e locali dopo il reclamo della scheda;
finché nessuno dei due ha reclamato, la scheda evento lo dice. La Home mostra solo le serate
in programma; le serate passate restano nelle pagine di artista, locale e nella dashboard di
chi le ha pubblicate.

# I ruoli e le loro regole

Quando ti registri scegli **come vuoi usare OpenStage**. La scelta non è un'etichetta
cosmetica: determina cosa puoi fare e quali pagine vedi.

| Ruolo | Per chi è | Cosa può fare |
| --- | --- | --- |
| **Fan** | Chi vuole scoprire concerti | Esplorare mappa ed eventi, cercare, filtrare, salvare i preferiti |
| **Artista** | Musicisti, band, dj, progetti | Tutto ciò che fa un fan, più: profilo artista e pubblicazione dei propri concerti |
| **Locale / Organizzatore** | Locali, circoli, festival, promoter | Tutto ciò che fa un fan, più: profilo del locale e programmazione degli eventi |
| **Admin** | Solo lo staff di OpenStage | Accesso completo per assistenza e correzioni |

## La regola importante: il ruolo è definitivo

Questa è una scelta precisa del progetto, e vale **sia per la registrazione via email sia per
quella con Google**:

| Situazione | Cosa succede |
| --- | --- |
| Ti registri come **Artista** | Resti artista **per sempre** |
| Ti registri come **Locale** | Resti locale **per sempre** |
| Ti registri come **Fan** | Puoi diventare **Artista o Locale**, ma **una volta sola**; dopo non si torna indietro |
| Sei un fan e vuoi tornare fan dopo essere diventato artista | Ti serve un **nuovo account** |

Il motivo è la coerenza della community: un profilo artista non deve poter diventare un
locale (o viceversa) dall'oggi al domani, perché gli eventi, i fan e i locali che ci hanno
interagito si fidano di quel profilo.

> **Se hai sbagliato a scegliere**, scrivi allo staff: l'admin può correggere il ruolo dalla
> dashboard (è l'unica eccezione prevista alla regola).

# Registrazione e primo accesso

## Con email e password

1. Vai su **Registrati** dalla barra in alto.
2. Inserisci nome, email e password.
3. Conferma il **captcha** (protezione anti-bot Cloudflare Turnstile).
4. Premi **Crea account**: riceverai un'email da `noreply@getopenstage.it`.
5. Apri il link di conferma. Dopo la conferma scegli il **ruolo** (Fan, Artista, Locale).
6. Se hai scelto **Artista** o **Locale**, compila la scheda del profilo; altrimenti torni
   alla Home da utente autenticato.

> La conferma email è **obbligatoria**: senza il link l'account non può accedere. Controlla
> anche la cartella spam. Il ruolo si sceglie **dopo** la conferma, non nel form di
> registrazione.

## Password dimenticata

1. Nella pagina **Accedi** clicca **Password dimenticata?**.
2. Inserisci l'email dell'account e completa il captcha.
3. Apri il link che arriva da `noreply@getopenstage.it` **nello stesso browser** in cui hai
   fatto la richiesta.
4. Scegli la nuova password (almeno 8 caratteri) e salva.
5. Torna al login e accedi con la nuova password.

Se il link è scaduto, richiedine un altro dalla pagina **Password dimenticata?**.

## Con Google

1. Clicca **Continua con Google** nella pagina di accesso o registrazione.
2. Scegli il tuo account Google.
3. Google ha già verificato l'email: **non arriva nessuna email di conferma**.
4. Al primo ingresso compare la **schermata di scelta del ruolo**. Da quel momento la regola
   dei ruoli definitivi vale esattamente come per l'email.

## La barra in alto quando sei dentro

Dopo l'accesso, in alto a destra vedi:

- il tuo **indirizzo email**;
- un **badge colorato con il tuo ruolo** (viola = Artista, ciano = Locale, rosa = Admin,
  grigio = Fan);
- un **link contestuale**: per un fan "Diventa artista o locale", per un artista o un locale
  "Crea evento";
- il pulsante **Esci**.

## Diventare artista o locale (solo se sei un fan)

1. Clicca **Diventa artista o locale** nella barra in alto.
2. Scegli **Artista** o **Locale** e conferma.
3. Se scegli Artista vieni portato al profilo artista; il badge in alto cambia subito colore
   e il link di upgrade **sparisce**, perché la scelta è definitiva.

Se torni su quella pagina dopo la scelta, OpenStage ti mostra **"Il tuo ruolo è già attivo"**
con il tuo ruolo: è la conferma che il blocco funziona anche lato database.

# Trovare un concerto

Questa è la parte che oggi funziona di più: la Home è un **muro di locandine** reali, seguito
da una lista di serate, ricerca e filtri; la mappa è una fascia dedicata e ha una modalità a
tutto schermo. Tutto è navigabile anche senza JavaScript (le pagine arrivano già composte dal
server, così i link sono condivisibili e le anteprime social funzionano).

## La Home

- In cima ci sono **fino a quattro locandine vere**, scelte tra le serate in evidenza o tra
  le prossime in programma. Sono immagini caricate dagli artisti o dai locali: nessuna foto
  di repertorio.
- Il titolo della Home è **"Stasera si suona."**: un invito diretto, non uno slogan
  pubblicitario.
- Sotto il muro c'è la **lista delle prossime serate**, con data grande, titolo, luogo,
  genere, orario e ingresso. È una lista editoriale, non una griglia di schede.
- Se cerchi o filtri, cambiano i risultati della lista; il muro resta la copertina della
  pagina.
- Le serate scelte dallo staff per la vetrina alimentano il muro. **Non si può pagare per
  comparire**: non esiste un algoritmo "pay-to-play".
- Sotto la lista c'è la sezione **Città**: mostra al massimo **sei città**, in **ordine
  alfabetico**, con il numero di serate future e la prossima data. Il link **Tutte le città**
  porta a `/citta`. Le città non sono un elenco fisso: entrano quando c'è almeno una serata
  pubblicata e vengono lette dal database.
- Dopo l'accesso, nella **navbar desktop** il pulsante **Dashboard** è evidenziato: non è più
  un link grigio confuso tra le altre voci.

## La mappa

- La mappa sta in una **fascia a tutta pagina** sotto la lista e si carica solo quando serve.
  Ha un **globo 3D** che ruota una volta sola, come introduzione, e si ferma al primo tocco.
  Se il tuo sistema chiede "meno animazioni", la rotazione non parte nemmeno.
- I **pin** sono gli eventi futuri. Più serate nello **stesso locale** diventano **un pin
  solo** con il numero delle date, per non avere tre puntini sovrapposti.
- Toccando un pin si apre una **scheda compatta**: data e ora nel fuso dell'evento, titolo,
  locale, genere, tipo e ingresso. Su desktop è un popup ancorato al pin; su mobile è un
  **bottom sheet** che sale dal basso.
- Se il locale ha più serate, le scorri **una alla volta** con le frecce e il contatore
  `‹ 1 / 3 ›`; la scheda resta della stessa altezza e non esce dalla mappa.
- Dalla scheda: **Pagina evento**, **Biglietti** (se ci sono), **Apri in Google Maps**,
  **Salva** e **Condividi**. I pulsanti hanno un'area di tocco di almeno 44 px.
- Il popup desktop lascia spazio alla ricerca e ai filtri: non finisce più sotto il pannello
  dei filtri quando la mappa è a tutto schermo.
- Gli eventi che dichiarano una posizione **approssimata** mostrano un'area invece di un
  punto, e la pagina evento lo spiega.
- **A tutto schermo** (voce "Mappa" nella barra, oppure il pulsante sulla mappa) la mappa
  diventa l'intera pagina: è la modalità migliore per esplorare.
- **Su mobile:** un dito **scorre la pagina** (la mappa non "ruba" il gesto), la mappa si
  muove solo nella modalità a tutto schermo o con **due dita**. Così non resti mai bloccato
  dentro la mappa.
- Il pulsante **Vicino a me** chiede al browser la posizione precisa e centra la mappa lì.
  Senza il tuo consenso la mappa usa una posizione approssimativa (città), ricavata dalla
  connessione: non serve alcun permesso.

## La ricerca

Sopra la lista c'è la **barra di ricerca**. I suggerimenti arrivano **dal database di
OpenStage**, non da un servizio esterno, e sono raggruppati per tipo: **città, artisti,
locali, eventi, generi**. Scrivendo "druso" trovi il locale; scrivendo "rock" trovi il genere.

## I filtri rapidi

| Filtro | Cosa fa |
| --- | --- |
| **Stasera** | Gli eventi di oggi (la serata italiana, calcolata sul fuso `Europe/Rome`) |
| **Questo weekend** | Sabato e domenica della settimana corrente |
| **Questa settimana** | I prossimi sette giorni |
| **Prossimi 30 giorni** | Il mese che viene |
| **Distanza** | Raggio in km intorno a un centro: la tua posizione approssimata, o quella scelta |
| **Genere** | Solo i generi realmente presenti negli eventi pubblicati |
| **Tipo di evento** | Concerto, dj set, festival, open mic, acustico, altro |
| **Ingresso gratuito** | Solo le serate a ingresso libero |

Ogni filtro **scrive nell'indirizzo della pagina**: puoi copiare il link e chi lo apre vede
esattamente la tua stessa lista. La lista e la mappa leggono gli stessi parametri, quindi non
possono mai mostrarti cose diverse. Filtrando, la pagina **resta dove sei**: non torna in cima.

## Muro, lista e mappa

- **Muro di locandine**: le immagini reali delle serate in evidenza o delle prossime date.
  Su desktop e mobile cambia la composizione, non il contenuto.
- **Lista a righe**: ogni serata ha data, titolo, artista/locale, genere, orario e prezzo o
  ingresso gratuito. Le righe sono cliccabili e portano alla pagina evento.
- I risultati sono **paginati a 12** per pagina, e i filtri restano attivi cambiando pagina.
- **Mappa**: la stessa ricerca applicata ai pin; il pulsante "Apri a schermo intero" porta a
  `/mappa`, dove la mappa occupa tutta la pagina. La Home non usa più l'interruttore
  schede/tabella.
- **In evidenza**: le serate scelte a mano dallo staff compaiono nel muro. Non esiste una
  sezione pubblicitaria separata e **non si può pagare per comparire**.
- Se una ricerca non trova nulla, la pagina **non ti lascia a mani vuote**: ti spiega che il
  database è ancora piccolo e ti invita a segnalare locali e artisti che conosci.

## Salvare un evento

Il pulsante **Salva** scrive davvero nel database, sul tuo profilo (serve l'accesso). I
preferiti sono raccolti in **Dashboard → Preferiti** (`/dashboard/saved`), dal più recente.
Se non hai una dashboard da artista o locale, la voce è disponibile anche per i fan.

# Reclamare la tua scheda

Se una scheda artista o locale è stata creata dalla redazione, puoi diventarne proprietario.

## Artista

1. Apri la tua scheda in **Artisti**.
2. Premi **Sono io** e inserisci un **link pubblico** che provi che la scheda è tua (il tuo
   sito, una pagina social, una pagina con il tuo nome).
3. Il collegamento è **immediato**. Se gestisci già un'altra scheda artista, il sistema te lo
   dice: un profilo amministra una scheda sola.

## Locale

1. Apri la scheda del locale in **Locali** e premi **Sono il gestore**.
2. Inserisci la prova e un messaggio: la richiesta va in **approvazione** dallo staff.
3. Finché è in attesa la vedi in **Account**, e puoi **ritirarla**. Non puoi creare una seconda
   scheda mentre la richiesta è aperta.
4. Quando l'admin approva, la scheda diventa tua e ricevi il badge **Verificato**.

La verifica non è un badge decorativo: è il permesso che consente la pubblicazione diretta
delle serate. Il primo evento di un account appena verificato può passare dalla revisione
dello staff; dopo, le pubblicazioni sono automatiche.

# Pubblicare una serata

La dashboard è il posto dove gestisci il tuo profilo e le tue date.

| Voce | Cosa trovi |
| --- | --- |
| **Panoramica** | Bozze, pubblicate, annullate e preferiti |
| **I miei eventi** | Tutte le tue serate, divise tra in programma e **passate** |
| **Crea evento** | Il modulo di pubblicazione |
| **Preferiti** | Le serate che hai salvato |
| **Profilo / Account** | La tua scheda, la richiesta di reclamo e le impostazioni |

Nel modulo puoi inserire titolo, artista, data e ora, locale o nome del posto, indirizzo con
pin sulla mappa, genere, tipo, prezzo o ingresso gratuito, link biglietti, locandina e il
testo **"Come arrivare"** per i posti difficili da trovare. La posizione può essere **esatta o
approssimata**: se scegli l'area, la pagina evento mostra una zona e non un punto finto.

Le serate nascono in **bozza**: puoi pubblicarle, annullarle o modificarle. Un locale può
collegare la scheda di un artista esistente; se una serata simile è già presente, il sistema
ti avvisa e ti lascia decidere. C'è un tetto anti-spam di **10 serate nelle 24 ore** per
account, imposto dal database.

La **serata passata** non sparisce dalla tua dashboard: finisce nella sezione "Passate". Puoi
eliminarla definitivamente (con conferma) se è un doppione o un errore; l'admin può farlo su
qualsiasi scheda.

# Scrivere allo staff

La pagina **Contatti** (`/contatti`) ha un modulo vero: il messaggio viene salvato nel
database, non affidato a un semplice link `mailto:`. Servono nome, email, un argomento
(domanda generale, artista, locale, segnalazione, privacy o altro) e il testo; il modulo ha un
campo nascosto anti-bot e limiti di lunghezza.

Dopo l'invio vedi una conferma. Lo staff legge i messaggi in **Admin → Messaggi**
(`/admin/messaggi`), li filtra per **nuovi**, **letti** e **chiusi** e può rispondere via email.
In questa fase **non parte un'email automatica**: la risposta usa il client di posta di chi
gestisce la coda. La casella ufficiale e la risposta integrata arriveranno con la Fase 7.

# Segnalare una serata

Nella pagina di una serata in programma, chi ha un accesso può usare **Segnala questa
serata** e scegliere un motivo (informazioni sbagliate, spam, contenuto offensivo, altro). La
segnalazione arriva solo allo staff: **non è una recensione e non è pubblica**. Dopo tre
segnalazioni da persone diverse e verificate, la serata va in pausa automaticamente e aspetta
un controllo umano; l'admin può rimetterla online, annullarla o sospendere l'autore.

# Navigare il sito

| Voce | Cosa trovi |
| --- | --- |
| **Esplora** (Home) | Muro di locandine, lista delle prossime serate, ricerca, filtri e mappa |
| **Mappa** | La mappa a tutto schermo, con gli stessi filtri della Home |
| **Artisti** | Directory reale con ricerca, filtri, schede e concerti futuri |
| **Locali** | Directory reale con ricerca, filtri, schede e programmazione |
| **Per gli Artisti** | Pagina editoriale reale: cosa ottiene un artista, reclamo e pubblicazione |
| **Per le Venue** | Pagina editoriale reale: programmazione, dashboard e pubblico locale |
| **Chi siamo** | Pagina editoriale reale: principi, storia e cosa è (e non è) OpenStage |
| **Città** | Indice completo su `/citta`; la Home ne mostra solo sei, in ordine alfabetico |
| **Accedi / Registrati** | Accesso e creazione account |
| **Dashboard** (dopo l'accesso) | I miei eventi, crea evento, preferiti, profilo e impostazioni; il pulsante è evidenziato in navbar |
| **Admin** (solo staff) | Coda dei reclami, moderazione delle serate e coda messaggi |

> Le pagine di servizio (Privacy Policy, Termini, Cookie Policy, Chi siamo, Contatti, FAQ)
> sono raggiungibili dal **footer** in fondo a ogni pagina. Chi siamo, Contatti e FAQ sono
> reali; Privacy, Termini e Cookie sono ancora segnaposto e lo dicono apertamente.

## Lingua

La piattaforma parte in **italiano** se ti colleghi dall'Italia, in **inglese** da qualsiasi
altro paese. Puoi cambiarla quando vuoi con il selettore **IT / EN** nella barra in alto: la
lingua vive nell'indirizzo (`/it/...` oppure `/en/...`), quindi un link mantiene la lingua
anche quando lo condividi. La scelta viene ricordata alla visita successiva.

## Il player in basso (non ancora attivo)

È previsto un **player Spotify fisso** in fondo allo schermo, per ascoltare in background le
playlist di OpenStage mentre navighi. **Oggi però non si vede**: il player esiste nel codice ma
compare **solo** quando è configurata una playlist pubblica, e le playlist di OpenStage non sono
ancora state create. Non c'è niente di rotto: è una funzione **spenta**, non una funzione
mancante. Quando le playlist esisteranno, il player si accende con una sola impostazione, senza
modifiche al codice.

# Domande frequenti

**Posso avere due profili (uno da fan e uno da artista) con la stessa email?**
No: ogni email è un account. Se hai scelto artista e volevi fare il fan, puoi comunque
esplorare tutto e salvare i preferiti: le funzioni da fan restano disponibili.

**Ho scelto Locale ma sono un musicista: posso cambiare?**
No, il ruolo è definitivo. Scrivi allo staff: solo l'admin può correggere.

**Perché mi ha chiesto il ruolo dopo la conferma email o dopo Google?**
Il ruolo si sceglie **dopo** aver verificato l'email, così un errore di battitura non crea un
profilo artista o locale sbagliato. Con Google non arriva nessuna email di conferma perché
Google ha già verificato l'indirizzo; la schermata del ruolo è quindi il primo passaggio.

**Devo pagare qualcosa?**
No. Il piano base è gratuito per fan, artisti e locali: è un principio del progetto.

**Perché sulla mappa vedo un pin con più date?**
Perché quel locale ospita più serate: raggrupparle in un punto solo evita pin sovrapposti e
rendere illeggibile la mappa. Le date si scorrono con le frecce nella scheda.

**Perché su mobile la mappa non si muove quando trascino?**
È voluto: un dito serve a **scorrere la pagina**, altrimenti resteresti intrappolato dentro la
mappa. Per muoverla usa **due dita**, oppure aprila a tutto schermo.

**Perché un evento dice "non ancora rivendicato"?**
Perché né l'artista né il locale hanno ancora reclamato la loro scheda. Puoi reclamarla dalla
scheda stessa: per un artista il collegamento è immediato con un link di prova; per un locale
serve l'approvazione dello staff.

**Ho salvato un evento: dove lo ritrovo?**
In **Dashboard → Preferiti** (`/dashboard/saved`), dal più recente. Il salvataggio è reale e
resta legato al tuo account.

**Come pubblico una serata?**
Dalla **Dashboard → Crea evento**, se il tuo profilo è artista o locale. Se sei ancora un fan,
prima devi scegliere il ruolo; la scelta è definitiva. Il primo evento può passare dalla
revisione dello staff, poi la pubblicazione è automatica.

**Non trovo eventi nella mia città: la piattaforma è rotta?**
No. Il database cresce con i locali e gli artisti che pubblicano: all'inizio ci sono poche
città. Se conosci un locale o un artista che dovrebbe esserci, segnalalo.

**Dove trovo tutte le città?**
Nell'indice **`/citta`**, raggiungibile dal link "Tutte le città" nella sezione Città della
Home e dal footer. La Home mostra solo sei città in ordine alfabetico, così non diventa un
elenco lunghissimo.

**Perché la creazione evento non compare?**
Perché il tuo profilo è ancora **fan**. La creazione è riservata ad artisti e locali: scegli il
ruolo dalla barra in alto (la scelta è definitiva) oppure reclama la tua scheda esistente.
