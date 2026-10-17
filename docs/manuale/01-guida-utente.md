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

**Fatto e online:** identità e accesso (email e Google), ruoli con regole definitive, design
system, doppia lingua IT/EN, pagine pubbliche di servizio, **mappa interattiva degli eventi**
con globo 3D e pin, **pagine evento**, **ricerca con suggerimenti**, **filtri rapidi**
(stasera, weekend, settimana, 30 giorni, distanza, genere, tipo, ingresso gratuito),
**salvataggio degli eventi**, vetrina con **schede o tabella**, sezione **"In evidenza"**,
contatori reali in home, database con sicurezza a livello di riga, deploy continuo.

**In arrivo nelle prossime fasi:** schede pubbliche di artisti e locali con **reclamo della
scheda**, pubblicazione e gestione degli eventi dall'app, pagina dei preferiti, notifiche
email, pagamenti opzionali.

**Da sapere oggi:** gli eventi presenti sono **reali ma inseriti dalla redazione di
OpenStage**, non ancora dagli artisti e dai locali (quella funzione arriva con l'editor degli
eventi). Un evento inserito da noi resta marcato *"non ancora rivendicato"* finché il locale o
l'artista non reclamano la propria scheda.

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
2. Inserisci nome, email, password e scegli il ruolo (Fan, Artista, Locale).
3. Conferma il **captcha** (protezione anti-bot Cloudflare Turnstile).
4. Sei dentro. Se hai scelto **Artista**, vieni portato direttamente alla compilazione del
   profilo artista; altrimenti torni alla home.

> In questa fase la **conferma via email è disattivata**: l'account è attivo subito. Nelle
> fasi successive verrà attivata con le email transazionali.

## Con Google

1. Clicca **Continua con Google** nella pagina di accesso o registrazione.
2. Scegli il tuo account Google.
3. Google **non** trasmette a OpenStage il ruolo scelto prima dell'accesso: per questo, al
   primo ingresso, compare una **schermata di scelta del ruolo**. Da quel momento la regola
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

Questa è la parte che oggi funziona di più: la Home è una vetrina con **mappa, ricerca,
filtri e risultati**, e tutto è navigabile anche senza JavaScript (le pagine arrivano già
composte dal server, così i link sono condivisibili e le anteprime social funzionano).

## La mappa

- La Home apre con un **globo 3D** che ruota una volta sola, come introduzione, e si ferma al
  primo tocco. Se il tuo sistema chiede "meno animazioni", la rotazione non parte nemmeno.
- I **pin** sono gli eventi futuri. Più serate nello **stesso locale** diventano **un pin
  solo** con il numero delle date, per non avere tre puntini sovrapposti.
- Toccando un pin si apre la **scheda**: data e ora nel fuso dell'evento, titolo, locale,
  genere, tipo e ingresso gratuito. Se il locale ha più serate, le scorri **una alla volta**
  con le frecce e il contatore `‹ 1 / 3 ›`.
- Dalla scheda: **Pagina evento**, **Biglietti** (se ci sono), **Apri in Google Maps**,
  **Salva** e **Condividi**.
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

Sotto la mappa c'è la **barra di ricerca**. I suggerimenti arrivano **dal database di
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

## Schede, tabella e "In evidenza"

- **Schede** (predefinito): ogni evento con poster, titolo, artista, data, locale e genere.
- **Tabella**: la stessa lista in forma compatta, per confrontare più serate a colpo d'occhio.
- Si cambia con l'interruttore sopra la lista, e la scelta resta nell'indirizzo.
- I risultati sono **paginati a 12** per pagina, e i filtri restano attivi cambiando pagina.
- **In evidenza**: fino a tre serate scelte a mano dallo staff. **Non si può pagare per
  comparire**: è una scelta editoriale, non pubblicità. La sezione si vede solo quando c'è
  almeno una serata scelta e quando non stai filtrando.
- Se una ricerca non trova nulla, la pagina **non ti lascia a mani vuote**: ti spiega che il
  database è ancora piccolo e ti invita a segnalare locali e artisti che conosci.

## Salvare un evento

Il pulsante **Salva** scrive davvero nel database, sul tuo profilo (serve l'accesso). Oggi non
esiste ancora una pagina che raccolga gli eventi salvati: arriva con i preferiti. Il
salvataggio però è reale e resta lì.

# Navigare il sito

| Voce | Cosa trovi |
| --- | --- |
| **Esplora** (Home) | Mappa, ricerca, filtri, vetrina degli eventi e contatori del progetto |
| **Mappa** | La mappa a tutto schermo, con gli stessi filtri della Home |
| **Artisti** | *Segnaposto*: l'elenco pubblico arriva con le schede artista (Fase 3) |
| **Locali** | *Segnaposto*: l'elenco pubblico arriva con le schede locale (Fase 3) |
| **Per gli Artisti** | *Segnaposto*: la pagina dedicata arriva con le schede artista |
| **Per le Venue** | *Segnaposto*: la pagina dedicata arriva con le schede locale |
| **Chi siamo** | *Segnaposto* |
| **Accedi / Registrati** | Accesso e creazione account |

> Le pagine di servizio (Privacy Policy, Termini, Cookie Policy, Chi siamo, Contatti) sono
> raggiungibili dal **footer** in fondo a ogni pagina. Alcune sono ancora segnaposto: lo
> dicono loro stesse.

## Lingua

La piattaforma parte in **italiano** se ti colleghi dall'Italia, in **inglese** da qualsiasi
altro paese. Puoi cambiarla quando vuoi con il selettore **IT / EN** nella barra in alto:
la scelta viene ricordata anche alla visita successiva.

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

**Perché mi ha chiesto il ruolo dopo l'accesso con Google?**
Perché Google non può trasportare quell'informazione. È il passaggio in più che sostituisce la
scelta fatta al momento della registrazione via email.

**Devo pagare qualcosa?**
No. Il piano base è gratuito per fan, artisti e locali: è un principio del progetto.

**Perché sulla mappa vedo un pin con più date?**
Perché quel locale ospita più serate: raggrupparle in un punto solo evita pin sovrapposti e
rendere illeggibile la mappa. Le date si scorrono con le frecce nella scheda.

**Perché su mobile la mappa non si muove quando trascino?**
È voluto: un dito serve a **scorrere la pagina**, altrimenti resteresti intrappolato dentro la
mappa. Per muoverla usa **due dita**, oppure aprila a tutto schermo.

**Perché un evento dice "non ancora rivendicato"?**
Perché l'ha inserito la redazione di OpenStage e il locale o l'artista non hanno ancora
reclamato la loro scheda. La funzione di reclamo arriva nella prossima fase.

**Ho salvato un evento: dove lo ritrovo?**
Oggi il salvataggio è reale ma la pagina che raccoglie i preferiti non esiste ancora: arriva
con i preferiti (backlog del progetto).

**Non trovo eventi nella mia città: la piattaforma è rotta?**
No. Il database cresce con i locali e gli artisti che pubblicano: all'inizio ci sono poche
città. Se conosci un locale o un artista che dovrebbe esserci, segnalalo.

**Non vedo ancora la creazione degli eventi: è rotta?**
No, non è ancora stata costruita: arriva con l'editor degli eventi. Se provi ad aprire "Crea
evento" oggi vedi una pagina segnaposto.
