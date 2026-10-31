# Beta test per ruoli — piano

Da eseguire nella **Fase 14B**, dopo Help Center e chiusura tecnica, prima del report finale.
Obiettivo: vedere OpenStage con gli occhi di chi lo userà, non con i nostri. Ogni ruolo ha
scenari, risultato atteso e criteri di fallimento.

## Metodo

- **Ambiente**: build di produzione su un **preview Vercel** (o localhost per i test
  distruttivi). La produzione si usa solo in lettura e con account di prova.
- **Account**: uno per ruolo (`+beta` sull'email), creati e cancellati a fine test.
- **Dati**: artista e locale con immagine/banner, 3 eventi futuri, 2 passati, 1 annullato,
  1 festival multi-giorno, 1 chiamata aperta, 1 booking in corso, 1 scheda non reclamata.
- **Strumenti**: Playwright per i flussi ripetibili, navigazione manuale per giudizio visivo,
  axe per l'accessibilità, Lighthouse mobile per le prestazioni.
- **Gravità**: `BLOCCANTE` (impedisce il lancio), `ALTO` (da sistemare prima), `MEDIO`
  (dopo il lancio), `BASSO` (cosmetico).
- **Output**: `docs/report-beta.md` con findings, gravità, correzioni e stato.

## I ruoli

### 1. Fan loggato

Cosa deve funzionare: Home, filtri, salvataggio, follow, notifiche, preferiti, export e
cancellazione account.

- Salva 3 eventi → compaiono in Preferiti e in “Per te”.
- Segue un artista → riceve notifica quando pubblica una data.
- Cancella una notifica e poi tutte.
- Non vede voci di menu che non gli competono (niente “Crea evento”).
- Modifica preferenze notifiche; scarica i dati; cancella l'account.

Fallisce se: un CTA lo porta al onboarding senza spiegazione, se i Preferiti non si
aggiornano, se le notifiche restano “non lette” anche dopo la visita.

### 2. Artista loggato

Cosa deve funzionare: dashboard, eventi, EPK, immagini, booking, bacheca, statistiche.

- Panoramica: numeri veri, grafico, top serate; nessun numero inventato.
- Crea evento singolo e festival; salva bozza, pubblica, annulla con motivo.
- Carica avatar/banner e foto EPK; apre la pagina EPK e la stampa.
- Riceve un booking, risponde, imposta stato e promemoria, aggiunge una nota privata.
- Si candida a una chiamata; la candidatura finisce in Messaggi.
- Scarica statistiche e programmazione in CSV.
- Widget: copia il codice e lo vede funzionare.

Fallisce se: una bozza “sparisce”, se il salvataggio sovrascrive, se l'EPK esce senza link
cliccabili, se le statistiche non tornano con le visite reali.

### 3. Venue loggata

Cosa deve funzionare: programmazione, chiamate, booking, chiusura, statistiche.

- Pubblica una serata e collega un artista esistente.
- Crea una chiamata con tetto 2, alza il tetto, la chiude prima del limite.
- Riceve due candidature e le trova in Messaggi.
- Chiude il locale: le date future si annullano con motivo, la scheda lo dice, il contatto
  si spegne, il locale esce dalla directory. Riapre e rimette in programma una serata.
- Verifica che non possa creare eventi da chiuso.

Fallisce se: la chiusura lascia serate attive, se il tetto non blocca, se la riapertura
resuscita date annullate.

### 4. Persona non registrata (visitatore generico)

Cosa deve funzionare: tutto in lettura, senza muri inutili.

- Home, mappa, evento, artista, locale, chiamate, playlist, privacy: tutto leggibile.
- “Salva” porta al login spiegando perché; il booking spiega che serve un ruolo.
- Aggiunge al calendario e condivide senza account.
- Il player Spotify non parte finché non lo attiva.
- `?lang=en` cambia lingua e resta nel link.

Fallisce se: una pagina pubblica chiede il login per essere letta, se i meta social mancano,
se il sito è lento al primo caricamento.

### 5. Artista non registrato che visita (scheda non reclamata)

- Trova la propria scheda creata dalla redazione: capisce che è “non reclamata”.
- “Sono io” → registrazione → claim con link pubblico.
- Dopo il claim vede dashboard, eventi e statistiche.
- Prova a reclamare una scheda non sua: viene fermato.

Fallisce se: il claim non spiega cosa serve, se dopo l'accesso la scheda non si collega,
se i dati della scheda vanno persi.

### 6. Venue non registrata che visita

- Stessa cosa, con approvazione staff: la richiesta resta “in attesa”, si vede in account,
  si può ritirare.
- La scheda dice che i contatti si attivano quando il locale prende la pagina.

Fallisce se: la richiesta sembra immediata, se non c'è modo di ritirarla, se il locale
riceve booking senza aver reclamato.

### 7. Curioso che visita

Non cerca un evento preciso: sta capendo cos'è OpenStage.

- In 10 secondi deve capire: mappa di serate, gratis, indipendente.
- Prova la ricerca con una città e un genere; i suggerimenti sono reali.
- Apre una scheda a caso e trova informazioni coerenti.
- Prova la lingua inglese.

Fallisce se: la Home sembra un gestionale, se non si capisce da dove iniziare, se i filtri
non danno risultati comprensibili.

### 8. Brand che visita

Cerca visibilità o una collaborazione.

- Trova subito che non c'è pubblicità e non si compra visibilità (About, Per gli artisti).
- Trova i contatti giusti e capisce che tipo di collaborazione ha senso (non sponsor pagata).
- Non trova prezzi o media kit: è voluto, ma il messaggio deve essere chiaro.

Fallisce se: sembra che si possa “comprare” una posizione, se i contatti sono nascosti, se
il tono è ambiguo sulle sponsorizzazioni.

### 9. Altro (quattro profili rapidi)

- **Giornalista/press**: trova chi siamo, numeri veri, contatti, possibilità di citare.
- **Persona con screen reader**: titoli, focus, form, mappa con alternative testuali.
- **Rete lenta / telefono vecchio**: Home e scheda entro pochi secondi, immagini leggere.
- **Bad actor**: prova a inserire spam, link malevoli, eventi falsi, richieste multiple:
  Turnstile, limiti e moderazione devono reggere.

## Criteri di uscita

- Nessun `BLOCCANTE` aperto.
- Al massimo 3 `ALTO`, tutti con correzione pianificata nella stessa fase.
- Report scritto con: cosa ho provato, cosa è successo, cosa correggo, cosa rimando.
- Fixture e account di prova rimossi; backup fatto prima dei test distruttivi.
