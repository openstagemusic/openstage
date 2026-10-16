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
system, doppia lingua IT/EN, pagine pubbliche (Home, Artisti, Locali, Per gli Artisti,
Per le Venue, Chi siamo, Contatti, Privacy, Termini, Cookie), database con sicurezza a livello
di riga, deploy continuo.

**In arrivo nelle prossime fasi:** mappa interattiva degli eventi, pubblicazione e gestione
degli eventi, schede artista e locale, ricerca e filtri, notifiche email, pagamenti.

# I ruoli e le loro regole

Quando ti registri scegli **come vuoi usare OpenStage**. La scelta non è un'etichetta
cosmetica: determina cosa puoi fare e quali pagine vedi.

| Ruolo | Per chi è | Cosa può fare |
| --- | --- | --- |
| **Fan** | Chi vuole scoprire concerti | Esplorare artisti, locali ed eventi; salvare i preferiti (prossime fasi) |
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

# Navigare il sito

| Voce | Cosa trovi |
| --- | --- |
| **Esplora** (Home) | La vetrina: hero animato, artisti e locali in evidenza, invito a cercare |
| **Artisti** | Elenco dei profili artista pubblicati, con paginazione |
| **Locali** | Elenco dei locali e degli organizzatori |
| **Per gli Artisti** | Perché OpenStage conviene a chi suona: visibilità, nessun costo, contatto diretto |
| **Per le Venue** | Come i locali riempiono la sala e collaborano con gli artisti di zona |
| **Chi siamo** | La storia e i valori del progetto |
| **Accedi / Registrati** | Accesso e creazione account |

In fondo alla pagina trovi il **footer** con contatti, Privacy Policy, Termini di Servizio,
Cookie Policy e i link social.

## Lingua

La piattaforma parte in **italiano** se ti colleghi dall'Italia, in **inglese** da qualsiasi
altro paese. Puoi cambiarla quando vuoi con il selettore **IT / EN** nella barra in alto:
la scelta viene ricordata anche alla visita successiva.

## Il player in basso

In fondo allo schermo c'è un **player Spotify** fisso: serve per ascoltare in background le
playlist di OpenStage mentre navighi, senza interrompere la navigazione (anche su mobile,
sopra il menu).

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

**Non vedo ancora la mappa o la creazione degli eventi: sono rotte?**
No, non sono ancora state costruite: arrivano nelle prossime fasi. Se provi ad aprire "Crea
evento" oggi vedi una pagina segnaposto.
