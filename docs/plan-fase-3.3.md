# Fase 3.3 — Dashboard, creazione eventi, locandine, anti-spam

> **Piano approvato il 18 ottobre 2026.** L'utente ha dato il via dopo la consulenza preventiva:
> nessun servizio esterno nuovo, nessuna variabile d'ambiente nuova, migration `0015`.
> Vincolo dato dall'utente: **su mobile il menu della dashboard non deve stare in fondo alla pagina**
> — sarà un pulsante in alto che apre un pannello laterale (come la navbar pubblica, che già usa
> l'hamburger). Su desktop resta la barra laterale.
>
> **Aggiornamento (blocco 3.3.2b)**: dopo aver provato l'editor, l'utente ha chiesto che cercare una
> città o un locale **muovesse la mappa** (senza geocodifica il campo città riempiva solo del testo).
> Approvata quindi la geocodifica **Photon (komoot)**: nessuna chiave, nessun account, nessun costo.
> Le migration della fase slittano di uno: `0017` cache delle ricerche.
>
> **Aggiornamento (blocco 3.3.2c)**: provando la 3.3 l'utente ha trovato un vicolo cieco. Creati due
> eventi con profili non verificati, li ha pubblicati dalla coda delle bozze dell'admin: gli eventi
> sono andati online, ma i **profili sono rimasti "in attesa di verifica"**, perché pubblicare un
> evento non sfiorava `profiles.verified_at` e quei profili — nati creando la propria scheda — non
> avevano nessun reclamo da cui farsi vedere in coda (è il **B33**). Da qui il blocco 3.3.2c, che
> chiude anche B33. Le migration slittano ancora di uno: `0018` pubblicazione che verifica,
> `0019` locandine, `0020` limite nel database.
>
> **Aggiornamento (blocco 3.3.3)**: dato il via libera alle locandine con due richieste dell'utente —
> la foto deve vedersi **intera** su scheda e locandina, e si carica un **file**, non un indirizzo web.
> Nessun servizio nuovo e nessuna variabile d'ambiente: **Supabase Storage** era già nel progetto, si
> aggiunge solo il bucket `event-covers` (migration `0019`) con tetto **3 MB** e soli **JPEG/PNG/WebP**,
> più le politiche di lettura pubblica e scrittura nella propria cartella.

## Divisione in blocchi (uno per volta, con build e commit)

| Blocco | Cosa contiene | Migration |
| --- | --- | --- |
| **3.3.1** ✅ | Guscio della dashboard (barra laterale su desktop, hamburger + pannello su mobile), **I miei eventi** con bozze/pubblicati/annullati e le azioni *pubblica / annulla / elimina bozza*, **Preferiti**, panoramica con i numeri | nessuna |
| **3.3.2** ✅ | Editor: `/dashboard/events/new` e `/dashboard/events/[id]` con anteprima dal vivo della scheda, locale collegato o scritto a mano, mini mappa con pin trascinabile, tutti i campi | `0015` (colonne `price_text` e `venue_name`), `0016` (la ricerca restituisce i nuovi campi) |
| **3.3.2b** ✅ | **Geocodifica**: cercando una città o un indirizzo la mappa vola lì e il pin si posa sul posto; il locale collegato si vede subito; trascinando il pin la città si riempie da sola | `0017` (cache delle ricerche di luoghi) |
| **3.3.2c** ✅ | **Pubblicare il primo evento verifica il profilo**: l'admin pubblica la bozza e, nello stesso gesto, chi l'ha scritta diventa verificato; l'admin vede **tutti** i profili non verificati, anche senza reclamo (**B33**) | `0018` (funzione `admin_publish_event`) |
| **3.3.2d** ✅ | **Correzioni sulla mappa**: sulla Home il trascinamento col mouse non muoveva la mappa e la rotellina faceva passi minimi (l'ingresso rotante azzerava i gestori); i menu a tendina avevano voci illeggibili (sfondo bianco su testo bianco) | nessuna |
| **3.3.2e** ✅ | **"Vicino a me" sulla Home**: l'ingresso rotante rubava la camera a chi cliccava nei primi secondi (e la posizione era chiesta grossolana, senza dire quanto fosse incerta) | nessuna |
| **3.3.3** ✅ | Locandina: caricamento su Supabase Storage **e** generatore dal vivo con il canvas; la foto si vede **intera** su schede, mappa e pagina evento | `0019` (bucket + policy) |
| **3.3.3b** ✅ | Correzione: **l'immagine della scheda** e **la locandina da condividere** diventano due cose separate — il poster generato non finisce più sulla card (non si carica da nessuna parte, si scarica) | nessuna |
| **3.3.4** | Limite **10 eventi per account nelle 24 ore imposto nel database**, regola bozza per i profili non verificati resa esplicita | `0020` (trigger) |

## Decisioni prese

- **Percorsi**: `/dashboard` (panoramica), `/dashboard/events` (i miei eventi),
  `/dashboard/events/new`, `/dashboard/events/[id]` (modifica), `/dashboard/saved` (preferiti).
  `/events/new` resta come **reindirizzamento**, così i collegamenti vecchi continuano a funzionare.
- **Menu mobile**: pulsante in alto a sinistra con etichetta "Menu" che apre un pannello laterale
  (vetro, sfondo scuro): niente elenchi in fondo alla pagina.
- **Cosa vede chi**: artista, locale e admin vedono eventi, creazione e preferiti; il fan vede solo
  preferiti e profilo. Le regole del database restano l'unica autorità.
- **Pubblica**: chi non è ancora verificato **non vede** il pulsante — il database lo riporterebbe
  comunque in bozza (`events_require_review`), quindi glielo spieghiamo invece di fingere che funzioni.
- **I miei eventi** sono gli eventi con `created_by` = il profilo collegato (la RLS già limita le
  righe; il filtro esplicito evita di mescolare gli eventi pubblicati da altri, che sono leggibili
  da tutti).
- **Preferiti**: `saved_events` unita agli eventi, con la stessa scheda degli elenchi pubblici.
- **Profilo / Impostazioni**: per ora puntano a `/account` (l'unica pagina di profilo esistente).
  Una voce "Impostazioni" a sé arriva con **B36** (cambio password / email), per non mettere un
  collegamento che non porta a niente.

## 3.3.2 — scelte fatte costruendo

- **Il locale si cerca fra quelli già su OpenStage** (`/api/venues`, solo con sessione) e, se non
  c'è, si scrive il nome a mano (`events.venue_name`): quello che si collega esiste davvero. Le
  coordinate dei posti **nuovi** arrivano dal geocodificatore — vedi 3.3.2b.
- **Il pin lo mette chi organizza.** Trascinandolo o cliccando sulla mappa; la mappa si apre sulla
  posizione del locale (o su quella di chi sta scrivendo). Verificato che il click sposta il pin e
  che le coordinate finiscono nel database.
- **Il prezzo è testo libero** (`price_text`): in un locale piccolo è "10 €", "offerta libera" o
  "8 € + tessera". Il campo compare solo se l'ingresso non è gratuito.
- **Artista e locale non si scelgono dal modulo**: l'artista della serata è chi la crea, il locale è
  quello collegato. `created_by` e `artist_id` li decide il server, così nessuno attribuisce una
  serata a un altro.
- **Le regole di validità stanno in `lib/events/editor.ts`**, fuori dal modulo: stesse regole per
  qualunque strada scriva un evento. Gli errori sono **codici** tradotti dai dizionari (il tipo
  `Record<EditorErrorCode, string>` impedisce di dimenticare una traduzione).
- **L'elenco pubblico passa da `search_events`**, che ha colonne fisse: senza la `0016` prezzo e
  nome del locale sarebbero comparsi solo aprendo la scheda dell'evento.
- La ricerca libera ora guarda anche `venue_name`: scrivere il nome di un locale senza scheda trova
  la serata.

## 3.3.2b — Geocodifica dei luoghi

Nato da un difetto che l'utente ha visto subito: **scrivere la città non muoveva la mappa**. Il
campo città riempiva l'indirizzo della scheda, i filtri e la ricerca, ma le coordinate arrivavano
solo da un locale già su OpenStage o da un pin messo a mano su una mappa che si apriva su chi
scriveva. Chi suona in un paese che non sa collocare restava bloccato.

- **La fonte è Photon (komoot)**, geocodificatore aperto su dati OpenStreetMap: nessuna chiave,
  nessun account, nessun costo, copertura mondiale, pensato per i suggerimenti mentre si scrive.
  Scartati: **MapTiler** (il piano gratuito è solo non commerciale: per un prodotto vero servirebbe
  un piano a pagamento) e **Nominatim** (la sua policy vieta l'autocomplete).
- **Passa dal nostro server** (`/api/geocode`, solo con sessione): il browser non parla mai col
  servizio esterno, e l'indirizzo del servizio sta in `GEOCODER_URL`, così un domani un Photon
  self-hosted è una variabile d'ambiente e non una riscrittura.
- **Le risposte si salvano in `geocode_cache`** (migration `0017`): la stessa città cercata due volte
  costa una chiamata sola. Lettura aperta a chi ha una sessione, scrittura soltanto dalla funzione
  `cache_geocode` (che controlla sessione, lunghezza della ricerca e numero di risultati): una cache
  condivisa non deve diventare un posto dove si scrive quello che si vuole. Una risposta **vuota non
  si salva**: un servizio momentaneamente giù non deve diventare "questo posto non esiste" per 90 giorni.
- **Nessun ordinamento legato a chi cerca**: Photon ordinerebbe i risultati anche in base alla
  posizione di chi scrive, ma una cache condivisa non può conservare risposte diverse per persone
  diverse. Meglio la stessa risposta per tutti.
- **Scegliendo un suggerimento**: la mappa vola sul posto, il pin si posa lì e la città si riempie dal
  risultato (per un indirizzo è il **comune**, non la via). La via non si salva perché non è una
  colonna di `events`: quello che conta è la posizione.
- **Anche il locale collegato si vede**: scegliendo "Druso" la mappa ci vola sopra, invece di lasciare
  il pin fuori dallo schermo (chiesta esplicitamente dall'utente).
- **Trascinando il pin**, se la città è ancora vuota si chiede la geocodifica inversa e si riempie da
  sola. Nessuna cache qui: le coordinate cambiano a ogni trascinamento.
- **Se Photon non risponde**, l'elenco resta vuoto e lo si dice: la città si scrive a mano e il pin si
  mette sulla mappa. Le città già usate su OpenStage restano come ripiego quando la ricerca non trova
  nulla. L'editor non ha vicoli ciechi.
- **Osservato durante i test**: il servizio pubblico risponde `503` se lo si chiama a raffica (nei
  test: decine di richieste in pochi minuti). Con l'uso normale non succede, e la cache assorbe le
  ricerche ripetute; se un domani diventasse un fastidio, `GEOCODER_URL` punta a un Photon
  self-hosted **senza toccare il codice**.

## 3.3.2c — Pubblicare il primo evento verifica il profilo

Difetto visto dall'utente provando la dashboard. La decisione 5 del piano (`docs/plan-fase-3.md`)
diceva "**primo evento in revisione, poi pubblicazione automatica**", ma nel costruire le due cose
erano rimaste separate: la coda delle bozze pubblicava l'evento, la verifica del profilo era un
pulsante a parte nella coda dei reclami. Risultato: chi si iscrive creando la **propria** scheda
non ha nessun reclamo, quindi non compare mai fra le "schede da verificare"; i suoi eventi restano
in bozza, e una volta pubblicati il profilo resta "in attesa di verifica" per sempre — e il suo
evento successivo ricade di nuovo in bozza.

- **Pubblicare la prima serata è la verifica.** `admin_publish_event` (migration `0018`) fa le due
  cose in una sola transazione: mette l'evento `published` e scrive `verified_at` sul `created_by`.
  L'admin ha appena guardato la serata: se è pubblicabile, quel profilo è credibile, e da lì in poi
  pubblica da solo (lo decide `events_require_review`, invariato). Il testo della coda lo dice.
- **Schede senza padrone**: con `created_by` vuoto non c'è nessuno da verificare, e la funzione non
  tocca `profiles`. `coalesce` conserva la prima verifica: ripremere il pulsante non la rinnova.
- **La regola sta nel database**, non nell'azione: `publishEventAction` si limita a chiamare la
  funzione, che rifà da capo il controllo `is_admin()`. Stessa forma delle funzioni di reclamo.
- **B33 chiuso qui** (era in 3.3.4): nel pannello c'è la sezione **"Profili da verificare"** con
  *tutti* i profili non verificati di ruolo artista o locale — email, ruolo e scheda collegata —
  indipendente dai reclami. Serve anche a **sbloccare i profili già pubblicati a mano** prima di
  questa correzione, che non ripassano più dalla coda delle bozze. Il ruolo `fan` resta fuori: non
  ha scheda né eventi.
- **Perché entrambe le strade**: pubblicare un evento non è una prova d'identità forte (chiunque può
  scrivere una serata), quindi la scorciatoia non basta da sola. Resta il pulsante manuale, per
  verificare — o togliere la verifica — quando l'evento non c'è.

## 3.3.2e — "Vicino a me" sulla Home

Segnalazione dell'utente: **su desktop il pulsante non portava dove si è**, mentre su un telefono
funzionava ("si vede che usa la posizione del telefono"). Provando la Home da computer il difetto si
riproduce: chi clicca **nei primi secondi** finisce sulla vista di regione, non sulla propria
posizione.

- **La causa è l'ingresso rotante**, che vive **solo sulla Home e solo su desktop** (`introSpin`),
  mentre su mobile non c'è: cliccando durante i suoi 4,2 secondi il volo verso la posizione partiva e
  subito dopo l'ingresso **riscriveva la camera** sulla zona iniziale. Il segnaposto restava dov'era,
  la mappa no: da qui l'impressione che il pulsante non funzionasse o portasse "in un punto non esatto".
  Ora l'ingresso **cede il passo**: chi ha già chiesto la sua posizione non se la vede portare via, e
  se il clic arriva prima del caricamento dello stile l'inquadratura si ripete appena è pronto.
- **La posizione era chiesta grossolana**: `enableHighAccuracy: false` con `maximumAge: 300000`, cioè
  il browser poteva rispondere con una posizione **in cache fino a cinque minuti** e presa dal
  provider di rete. Su un computer senza GPS è così che ci si ritrova sulla città del provider. Ora:
  posizione **precisa** (`enableHighAccuracy: true`), **mai in cache** (`maximumAge: 0`) — "Vicino a
  me" deve dire dove sei adesso.
- **Se il computer non ha la posizione di sistema attiva** una richiesta precisa può fallire: si
  riprova una volta, più grossolana, invece di lasciare il pulsante muto. Il "permesso negato" **non**
  si ritenta (l'utente ha già risposto).
- **Il browser dichiara il proprio errore** (`coords.accuracy`): sotto i 200 m il segnaposto vale da
  solo, come sempre; sopra, **non si finge precisione** — si disegna sulla mappa l'area in cui
  davvero ci si trova (lo stesso linguaggio grafico delle aree approssimative degli eventi) e lo si
  scrive ("Posizione approssimativa (±20 km): su un computer aiuta avere la posizione di sistema
  attiva"). Coerente con *Autenticità prima dell'Hype*: meglio dire "non lo so con precisione" che
  mostrare un punto falso.
- **Niente `fitBounds`** per inquadrare quell'area: con la proiezione a globo MapLibre può rinunciare
  a inquadrare un riquadro piccolo **in silenzio** (avvisa solo in console) e la mappa resterebbe
  ferma — osservato nei test. Lo zoom si calcola a mano (`zoomForRadius`) e si vola con `flyTo`,
  la stessa strada del caso preciso.

## 3.3.3 — Locandine

L'utente ha dato il via libera con due richieste precise: **la foto deve vedersi intera** (sulla scheda
e sulla locandina generata) e **si carica un file, non si incolla un indirizzo**.

- **Il formato del riquadro non si impone: si toglie il taglio.** Chiedere un quadrato all'origine
  avrebbe tagliato i poster verticali (la forma più comune) o li avrebbe rimpiccioliti. La regola è
  una sola: dentro il riquadro la foto si adatta (`object-contain`) e **i bordi che restano si
  riempiono con la stessa foto sfocata**. Il riquadro resta della forma giusta per il suo contesto:
  **quadrato** negli elenchi, nella scheda e nella miniatura della mappa (1:1 regge sia i poster
  verticali sia le foto quadrate degli eventi già inseriti), **4:3** nel pannello mobile della mappa,
  **16:10 / 16:9** nella pagina evento. Vale anche per le locandine **esterne** già presenti (i tre
  eventi inseriti da OpenStage): nessuna di quelle schede è più tagliata.
- **Senza locandina il riquadro resta**, con il fondo sfumato di OpenStage: con le schede quadrate una
  card vuota avrebbe lasciato un buco alto quanto il poster accanto.
- **Il file si carica dal browser** (`lib/covers/upload.ts`) e va dritto a Supabase Storage: le azioni
  del server hanno un tetto sul corpo della richiesta e la foto di un telefono lo supera al primo
  scatto. I limiti veri — **3 MB, solo JPEG/PNG/WebP** — sono impostati **sul bucket**, quindi li
  applica il servizio di archiviazione anche a chi non passa dal modulo; la stessa scelta fatta per il
  limite anti-spam: nel database, non nell'interfaccia. Verificato: file di testo rifiutato (415),
  file da 4 MB rifiutato (413), caricamento nella cartella di un altro rifiutato (403).
- **La cartella è il profilo** (`{profilo}/{uuid}.{ext}`): la prima parte deve essere il proprio
  `auth.uid()`, lo impone la politica di scrittura. Nessuno può sovrascrivere la locandina di un altro.
- **La foto si tocca solo quando serve**: se è già leggera e sotto i 1600 px parte **così com'è**
  (nessuna ricodifica). Solo se è più grande viene ridimensionata (lato lungo 1600 px) — una locandina
  si guarda sullo schermo, e un file leggero si carica anche con la linea debole di un locale. Il PNG
  resta PNG (la trasparenza non si butta per principio).
- **Il generatore è a un clic** (`lib/covers/flyer.ts`): dai dati già scritti (tipo di evento, titolo,
  quando, dove, prezzo) nasce una **locandina 1080×1350** in canvas, senza librerie: fondo scuro con
  aloni neon, la foto **intera** in un riquadro arrotondato (sfocata dietro, nitida davanti), tipo di
  evento e prezzo, titolo che si rimpicciolisce finché sta in tre righe, firma con la striscia
  viola-ciano-rosa. I caratteri sono quelli del sito, chiesti al documento (`next/font` genera nomi
  propri): senza aspettarli il canvas disegnerebbe un ripiego. La foto usata è quella **scelta un
  attimo prima e tenuta in memoria**, quindi non c'è niente da scaricare e nessun permesso da chiedere.
- **La locandina caricata non si cancella** quando si preme "Rimuovi" dal modulo: l'evento già
  pubblicato la sta mostrando, e toglierla prima di salvare lascerebbe la pagina pubblica rotta. Il
  file resta, il collegamento no; la pulizia dei file orfani è materia da amministratore.
- **Il database resta l'autorità anche sull'indirizzo**: la locandina si accetta solo se è un
  indirizzo http(s) vero e non più lungo di 500 caratteri. Non si chiude ai soli indirizzi del nostro
  archivio perché i tre eventi già online hanno locandine che vivono altrove e devono restare
  modificabili.
- La nota **B37** (posizione sbagliata al primo clic) resta in backlog e non è stata toccata, come
  deciso con l'utente.

## 3.3.3b — L'immagine della scheda e la locandina da condividere

Difetto visto dall'utente provando la 3.3.3: generando la locandina, **il poster diventava anche
l'immagine della scheda**. Effetto collaterale immediato: sulla card dell'evento la stessa foto
compariva due volte (una come poster caricato, una come locandina disegnata), e per giunta con il
titolo ripetuto sotto. La causa era che il generatore finiva nello stesso campo dell'immagine scelta
(`cover_image_url`), quindi il poster era insieme "grafica da condividere" e "foto dell'evento".

- **Due ruoli, due posti.** La sezione si chiama ora **"Immagine"** e contiene solo il caricamento
  del file (quello che si vede su scheda, mappa e pagina evento). Sotto c'è il blocco **"Locandina da
  condividere"**: anteprima del poster con **"Scarica"** e **"Rifai"**. La locandina generata **non
  viene caricata da nessuna parte** e non tocca `cover_image_url`: il poster è un file che si scarica,
  la card resta com'era. Il testo lo dice esplicitamente ("Non finisce sulla scheda — i dati sono già
  lì sotto").
- **Il poster si usa anche su un evento già salvato**: la sorgente della foto è il file scelto in
  questa sessione, oppure — se non ce n'è uno — **l'immagine già salvata**, riletta dal suo indirizzo
  (`crossOrigin`), così il generatore funziona anche aprendo un evento di ieri. Le immagini esterne
  che non concedono l'uso in canvas non rompono niente: il poster si disegna **senza** foto.
- **Il nome del file** è `openstage-<titolo>.jpg`: quello che serve per ritrovarlo fra i download.
- **Il poster invecchia**: cambiando titolo o immagine la vecchia anteprima si toglie (si scaricherebbe
  una locandina che parla di un'altra serata) e si rifà con un clic.
- **`uploadCoverBlob` è stato rimosso**: era la strada che faceva finire il poster nell'archivio, e con
  il nuovo disegno non serve più. Il caricamento resta uno solo, quello del file scelto.
- **Nessun dato duplicato**: la scheda mostra solo la foto scelta; il poster è un'immagine a parte.
  Le locandine esterne dei tre eventi già online restano intatte e modificabili.

## Test di fine fase (come da piano generale)

Si crea un evento reale: appare in "I miei eventi" e, se pubblicato, nella ricerca; l'11º evento
della giornata viene **rifiutato dal database**; l'account non ancora verificato resta in bozza.
