# Playbook di lancio — OpenStage

Versione 1 — 1 novembre 2026. Una città alla volta, zero budget, zero numeri gonfiati.

---

## 1. In una riga

**OpenStage è la mappa gratuita del live indipendente: le serate vere della tua
zona, i locali che le fanno e gli artisti che ci suonano — senza pubblicità,
senza pay-to-play, senza commissioni.**

Tutto quello che segue serve a far arrivare questa frase alle persone giuste
senza mentire su niente.

---

## 2. A chi parliamo

| Chi | Cosa vuole davvero | Cosa gli diciamo | Cosa NON gli diciamo |
| --- | --- | --- | --- |
| **Fan di zona** (18–40, vive in città o provincia) | Sapere cosa c'è stasera senza aprire cinque profili diversi | «Apri la mappa: le serate di questa settimana, con orari e indirizzi.» | «La piattaforma definitiva per scoprire eventi» |
| **Artisti emergenti** | Date, non follower. Un posto dove la propria scheda esiste anche senza social | «La tua scheda, le tue date, il tuo EPK. Gratis, e nessuno compra visibilità.» | «Cresci il tuo pubblico» |
| **Locali di quartiere** | Riempire le serate senza pagare piattaforme o commissioni | «La tua programmazione sempre aggiornata, gestita da te. Se una data salta, lo dici una volta e basta.» | «Marketing automation» |

Il pubblico del lancio **non è "gli italiani"**: è la gente che esce a Bergamo
(o nella città scelta) il venerdì. Un post per tutti non convince nessuno.

---

## 3. Prerequisito: la densità

Non si annuncia una mappa vuota. Prima del lancio, nella zona di partenza:

- [ ] **15–20 serate future** pubblicate (reali, con data, ora, luogo)
- [ ] **5–8 locali** con la scheda completa (indirizzo, città, link)
- [ ] **5–8 artisti** con la scheda (anche solo nome, città, genere, link)
- [ ] **almeno 3 locali reclamati** (la scheda è gestita da loro)
- [ ] una **foto o locandina** per almeno metà delle serate
- [ ] le serate di **questa settimana** ci sono: non solo il mese prossimo

Come si riempie (Fase 17, anticipata per questa zona):

1. Si parte dai **programmi pubblici** dei locali: sito, Instagram, rassegne
   stampa. Solo serate con una data verificabile.
2. Si crea la scheda del locale e la serata, con i dati pubblici (nome, città,
   indirizzo, link). **Niente testi copiati**, niente foto senza permesso.
3. Si manda **l'invito al claim** dal pannello (uno alla volta). Il locale
   riceve l'email che abbiamo riscritto: firma una persona, spiega perché la
   scheda esiste, dice cosa può farci.
4. Dopo 5–7 giorni, **un solo** sollecito — e solo se non ha risposto.

> Regola: se una serata non è verificabile, non entra. Meglio 12 serate vere che
> 30 righe da controllare.

---

## 4. Cosa misuriamo (e cosa no)

Metriche che contano, tutte già nel database:

| Cosa | Come si legge | Perché conta |
| --- | --- | --- |
| Serate future in zona | `events` con `status = 'published'` e data futura | è l'offerta reale |
| Schede reclamate | `venues.profile_id is not null` / `artists.profile_id is not null` | un locale che gestisce la scheda è un locale che torna |
| Serate pubblicate dai locali | `events.created_by` diverso dall'admin | il segnale che il prodotto serve |
| Serate salvate dai fan | `saved_events` | intenzione vera, non una visita |
| Inviti accettati | `claim_invites.status` | qualità del contatto, non volume |
| Messaggi dal modulo contatti | `contact_messages` | chi ha un problema lo dice: è una porta aperta |

**Non** misuriamo: follower, like, "engagement rate", visite senza ritorno.
Sono numeri che non dicono se qualcuno è andato a un concerto.

---

## 5. Calendario

### T-14 → T-7 — riempimento e asset

- [ ] Schede e serate della zona (sezione 3)
- [ ] Inviti ai locali, uno a uno
- [ ] 3 screenshot veri: mappa con i pin, scheda evento, scheda locale
- [ ] Una locandina quadrata per il post (titolo + città + «gratis»)
- [ ] Bio Instagram aggiornata: una riga + link `getopenstage.it`
- [ ] Google Search Console: proprietà verificata, sitemap inviata

### T-7 → T-0 — contatti diretti

- [ ] 10 locali contattati (scheda + invito)
- [ ] 10 artisti contattati
- [ ] 2 gruppi locali (Facebook/WhatsApp/Telegram di zona): un messaggio, non tre
- [ ] 3 storie Instagram di avvicinamento («sto costruendo la mappa delle serate
      di Bergamo, manca poco»)

### T-0 — il giorno del lancio

- [ ] Post di lancio (testo in sezione 7)
- [ ] Storia con la mappa della città
- [ ] Link in bio
- [ ] Nessun messaggio in blocco: solo risposte a chi scrive

### T+1 → T+7 — spinta

- [ ] Una serata al giorno in storia, presa dal sito (non inventata)
- [ ] Risposta a ogni commento e DM entro 24 ore
- [ ] Follow-up ai locali che non hanno risposto (una volta)
- [ ] Prime 2–3 schede reclamate: chiedi a loro di pubblicare la prima serata

### T+7 → T+30 — ascolto

- [ ] Cosa scrivono nel modulo contatti (leggi tutto)
- [ ] Quali serate vengono salvate di più
- [ ] Chi pubblica da solo (senza di te)
- [ ] Decisione: insistere sulla stessa città o aprirne una seconda

---

## 6. Asset da avere pronti

| Asset | Formato | Note |
| --- | --- | --- |
| Post di lancio | quadrato 1080×1080 | testo sotto, non dentro l'immagine |
| Storia | 1080×1920 | mappa della città con i pin |
| Reel (facoltativo) | 15–20 s | schermo registrato: apro la mappa, tocco un pin, si apre la serata |
| Screenshot puliti | 3 | mappa, scheda evento, scheda locale |
| One-pager per i locali | PDF di una pagina | cosa è, cosa non è, come si reclama la scheda |
| Email invito claim | già nel catalogo | si modifica dalla control room |

---

## 7. Testi pronti

### 7.1 Post di lancio (Instagram / Facebook)

> A Bergamo succedono più cose di quante ne sai.
>
> Ho aperto **OpenStage**: una mappa gratuita delle serate dal vivo della città.
> Niente pubblicità, niente biglietti, niente locali che pagano per stare in cima.
> Solo date vere, con orari e indirizzi.
>
> Apri la mappa, guarda cosa c'è questa settimana, salva quella che ti interessa.
> Se un locale non c'è, segnalalo: lo aggiungiamo.
>
> 👉 getopenstage.it

### 7.2 Storia

> **Stasera a Bergamo**
>
> Tre serate, tre indirizzi, tutte sulla stessa mappa.
> Quale ti interessa? (sondaggio: 1 / 2 / 3)

### 7.3 Reel — copione

1. (0–3 s) «Questa è Bergamo.»
2. (3–7 s) Schermo: mappa che si apre, pin che si accendono.
3. (7–12 s) «Queste sono le serate di questa settimana.»
4. (12–16 s) Tocco su un pin → scheda con orario e indirizzo.
5. (16–20 s) «Gratis, senza pubblicità. getopenstage.it»

### 7.4 Invito a un locale (email — già nel catalogo)

Oggetto: **«[Nome], la tua scheda su OpenStage»**
Firma: Francesco. Spiega perché la scheda esiste, cosa può farci, link monouso
valido 7 giorni, reply-to `ciao@getopenstage.it`.

### 7.5 Sollecito a un locale (dopo 5–7 giorni, una sola volta)

> Ciao, ti ho scritto la settimana scorsa perché OpenStage ha già una scheda di
> [Nome] con la vostra programmazione. Se preferisci gestirla tu, il link è
> ancora valido per qualche giorno: [link]. Se non ti interessa, dimmelo e non
> ti scrivo più.

### 7.6 Messaggio a un artista

> Ciao, ho visto che suoni spesso in zona. Su OpenStage c'è una mappa gratuita
> delle serate indipendenti: se vuoi, ti creo la scheda (bio, generi, date) così
> le tue serate compaiono anche lì. Nessun costo e nessuno compra visibilità.
> Ti mando il link per prenderla in gestione?

### 7.7 Gruppo locale (Facebook/WhatsApp di quartiere)

> Scusate l'intromissione — ho fatto una mappa gratuita delle serate dal vivo in
> zona, senza pubblicità: [link]. Se conoscete un locale che non c'è, scrivetemi
> e lo aggiungo. Se i moderatori preferiscono che non stia qui, tolgo subito.

### 7.8 Risposta a «ma ci guadagnate qualcosa?»

> No. È gratis per fan, artisti e locali: nessuna commissione sui biglietti,
> nessun locale che paga per stare in evidenza. Se un giorno servirà qualcosa in
> più (strumenti per chi organizza), sarà un piano a parte e il resto resta
> gratis. Mai pay-to-play.

---

## 8. Comportamento (le regole che non si negoziano)

1. **Un invito per locale.** Se non risponde, un sollecito. Poi basta.
2. **Nessun messaggio in blocco.** Ogni invito parte dall'azione sul singolo
   locale, con il suo nome dentro.
3. **Email solo da fonti pubbliche** (sito del locale, pagina contatti). Mai
   liste comprate, mai indirizzi raccolti a caso.
4. **Niente foto o testi copiati.** Si usano i dati minimi (nome, città,
   indirizzo, link) finché il locale non reclama.
5. **Se qualcuno dice no, è no.** Anche se la scheda resta online con i dati
   pubblici.
6. **Nessun numero gonfiato**, nemmeno nel post del lancio.

---

## 9. Target del primo mese (realistici, non entusiasmanti)

| Cosa | Target | Come leggerlo |
| --- | --- | --- |
| Serate future nella città di partenza | 15–20 | sotto 10, il lancio è prematuro |
| Locali contattati | 30 | a mano, uno per uno |
| Locali che reclamano la scheda | 4–6 | 15–20% è già un buon risultato |
| Artisti contattati | 20 | |
| Artisti con scheda reclamata | 3–5 | |
| Serate salvate (primo mese) | 30–60 | il segnale più onesto |
| Messaggi dal modulo contatti | 3–8 | ogni messaggio è una persona vera |
| Serate pubblicate dai locali da soli | 3–5 | è il traguardo: non servi più tu |

Se a 30 giorni le schede reclamate sono **zero**, il problema non è il sito: è
il messaggio o la zona. Si cambia uno dei due, non si insiste.

---

## 10. Se qualcosa non funziona

| Sintomo | Ipotesi | Cosa fare |
| --- | --- | --- |
| Visite ma nessun salvataggio | le serate non sono quelle giuste, o mancano i dettagli | controllare che orari e indirizzi siano corretti; chiedere a 5 fan cosa manca |
| Locali che non rispondono | email sbagliata o messaggio troppo lungo | controllare l'indirizzo sul sito, accorciare il messaggio, provare un DM |
| Utenti che scrivono «non c'è niente» | densità insufficiente | riempire, non pubblicizzare |
| Commenti «sembra la solita app» | il messaggio non dice cosa ci guadagna il fan | usare i post con serate concrete, non con promesse |
| Un locale si lamenta della scheda | non ha capito che è sua | rispondere subito, offrire la rimozione, sistemare l'invito |

---

## 11. Dopo il primo mese

- Se la città regge: **seconda città**, con lo stesso schema (mai due lanci
  insieme).
- Se i locali pubblicano da soli: si passa alla Fase 17 estesa (outreach per
  regione, sempre uno a uno).
- Se nessuno pubblica: il problema è il valore per il locale, non il traffico.
  Si intervista 5 locali veri prima di toccare altro.
