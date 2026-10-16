# Review Fase 2.1 — Homepage Discovery: globo, pin e scheda evento

> Review di fine blocco. La Fase 2 è costruita in tre blocchi (2.1 globo+dati, 2.2 ricerca+filtri,
> 2.3 vetrina+bento) per non lasciare mai la Home rotta in produzione.
> Le voci "da riprendere" finiscono anche in `docs/backlog.md`.

## Cosa funziona

- **Il globo è la mappa, non una decorazione.** MapLibre 6 con proiezione `globe` nativa: si ruota,
  si ingrandisce e passa a 2D con un clic, sullo stesso motore che disegna strade, città ed
  etichette. Nessun secondo motore 3D da mantenere.
- **Nessuna chiave API, nessun account, uso commerciale consentito.** OpenFreeMap serve stile e
  tile senza registrazione: l'unico obbligo è l'attribuzione, che è visibile sulla mappa
  (`© OpenFreeMap · © OpenStreetMap`) e non nascosta dietro un clic.
- **Gli eventi approssimativi sono onesti.** Chi non vuole pubblicare l'indirizzo esatto vede
  disegnata un'**area** (poligono geodetico di raggio reale, non un cerchio finto), e la scheda lo
  dice a parole: "Posizione approssimativa: l'evento è indicato come area, non come punto preciso".
- **La scheda dell'evento fa tutto quello che promette**: pagina evento, biglietti (solo se il link
  esiste davvero), Google Maps, salva e condividi. "Salva" scrive su una tabella vera
  (`saved_events` con RLS), non in memoria: se non hai un account ti porta al login e **ti riporta
  all'evento** dopo l'accesso.
- **Un dito scorre la pagina, due dita muovono la mappa.** La regola mobile richiesta è implementata
  dalle gesture cooperative native di MapLibre (con avviso tradotto in italiano), e a schermo
  intero (`/mappa`) le gesture tornano libere: è una pagina con URL proprio, non un pop-up.
- **La mappa non pesa sulla prima schermata.** MapLibre (1 MB di chunk) si carica solo quando il
  riquadro si avvicina alla viewport: la Home resta a 117 kB di primo caricamento e l'elenco sotto
  è renderizzato dal server, quindi leggibile e indicizzabile anche senza JavaScript.
- **L'ora è quella del locale, non del tuo telefono.** Ogni evento porta il suo fuso (`timezone`);
  un concerto alle 21:30 a Milano resta alle 21:30 anche guardandolo da un altro paese.
- **I nomi dei luoghi seguono la lingua dell'interfaccia**: in italiano la mappa scrive "Roma", non
  "Rome".
- Corretto in corsa un **difetto reale trovato solo provando in browser**: il contenitore di MapLibre
  veniva posizionato a 0 px (il CSS della libreria vince sull'ordine del bundle) e il canvas restava
  a 300 px di default. Ora il posizionamento vive in un guscio esterno.

## Allineamento ai valori di OpenStage

| Valore | Come si vede in questo blocco |
| --- | --- |
| Underground e indipendente | Il globo mostra gli eventi che esistono davvero, anche di una sala prove o di un circolo: nessuna soglia di "importanza" per comparire |
| Gratis per sempre | La mappa si basa su un fornitore gratuito e senza account: nessun costo per artista o locale, nessuna chiave da pagare |
| Autenticità prima dell'hype | Niente rotazione infinita per fare scena: il globo gira una volta sola e poi si ferma sulla zona utile. Gli eventi non rivendicati lo dichiarano ("Evento inserito da OpenStage") |
| UX senza attrito | La mappa si apre già sulla tua zona (dai dati di rete, senza chiedere permessi), la geolocalizzazione precisa resta un clic esplicito ("Vicino a me") |

## Tre suggerimenti

1. **Popolare con eventi veri prima di aggiungere altro.** Il globo è pronto ma vuoto: fino a quando
   non ci sono 5-8 eventi reali, non si può giudicare se i pin sono leggibili, se i cluster aiutano
   o se l'area approssimativa è comprensibile. Meglio inserirli ora, con il locale "non rivendicato",
   e guardare la mappa con occhi da fan.
2. **Tenere l'elenco come superficie principale su mobile.** Il globo è il gancio emozionale, ma chi
   cerca il concerto di stasera legge la lista: nella 2.3 la vetrina (schede/tabella) deve stare
   sopra o accanto alla mappa, non sotto due schermate di globo.
3. **Decidere ora la politica dei luoghi approssimativi.** Il database accetta raggio da 100 m a
   50 km: 50 km attorno a una città sono un'area enorme e poco utile. Vale la pena fissare un
   limite consigliato (per esempio 3-5 km in città, 20 km in provincia) e suggerirlo nell'editor
   eventi, altrimenti la mappa si riempirà di cerchi che non aiutano nessuno.

## Rischi e debito tecnico

| Voce | Gravità | Nota |
| --- | --- | --- |
| Fornitore tile gratuito senza SLA | Media | OpenFreeMap è un'istanza pubblica finanziata da donazioni: nessuna garanzia di servizio. L'indirizzo vive in un solo file (`lib/map/config.ts`), quindi passare a MapTiler o a tile self-hosted è una modifica di poche righe |
| Pin e pop-up non ancora provati con eventi reali | Media | La scheda e i pin sono stati verificati in browser con una riga temporanea (poi rimossa); manca la prova con dati veri, multipli e con locandine |
| "Salva" senza una pagina dei preferiti | Bassa | Il salvataggio funziona e resta nel database, ma l'utente non ha ancora un posto dove rivedere gli eventi salvati: serve una sezione nel profilo |
| Rotazione del globo solo in ingresso | Bassa | Scelta deliberata: una rotazione continua allontana la zona dell'utente dallo schermo, consuma batteria e richieste di tile. Se in futuro si vorrà una rotazione continua, va legata a "nessuna interazione da N secondi" e spenta su mobile |
| Nessun test automatico sulla mappa | Bassa | La verifica è stata fatta con un browser reale e script temporaneo (worker, tile, pop-up, pagina evento, 404, zero errori in console), poi rimosso: va reso ripetibile quando introdurremo i test end-to-end |
| `npm audit` con 7 segnalazioni su dipendenze di sviluppo/build | Bassa | Invariato dalla 1.3 (vedi backlog B03) |

## Da riprendere

In `docs/backlog.md`: prova con eventi reali e locandine, pagina "eventi salvati" nel profilo,
limite consigliato per il raggio delle posizioni approssimative, possibile rotazione continua
condizionata, test end-to-end della mappa.
