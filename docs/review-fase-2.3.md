# Review Fase 2.3 — Showcase (schede/tabella), In Evidenza e bento promozionale

Ultimo blocco della Fase 2. Chiude la Home: come si guarda l'elenco, cosa si
mette in vetrina e cosa racconta la piattaforma di sé.

## Cosa funziona

- **Selettore Schede / Tabella**: due link, non due stati locali. La scelta vive
  nella URL (`?vista=tabella`), quindi sopravvive a filtri, paginazione e
  condivisione, e funziona anche senza JavaScript. Cambiando vista la pagina
  **non torna in cima** (`scroll={false}`): il layout cambia sotto gli occhi.
- **Vista tabella** renderizzata dal server come le schede (stesso contenuto,
  stessa indicizzabilità): data, evento, artista, locale, genere, tipo, ingresso.
  Le colonne meno importanti si nascondono sugli schermi stretti e la tabella
  scorre in orizzontale invece di rompere il layout.
- **Slot "In Evidenza"** (`is_featured`, fino a 3): la sezione compare **solo**
  se c'è almeno un evento marcato, e sparisce quando si sta filtrando o
  cercando — è una scelta editoriale, non un risultato di ricerca. La scadenza
  `featured_until` è una data vera: l'evento esce dalla vetrina da solo, senza
  che nessuno debba ricordarsene.
- **Bento promozionale** sotto lo showcase, in tre righe pulite su desktop e
  impilato su mobile: "Come funziona" (3 passi numerati) + "Numeri veri" (i
  contatori) + "Per gli artisti" + "Per i locali" + i tre pannelli dei valori
  (Gratis per sempre, Underground prima di tutto, Autenticità per design). La
  vecchia fascia dei valori è stata assorbita qui: nessun contenuto perso, una
  sezione in meno da leggere.
- **Contatori animati da dati reali**: eventi in programma, artisti, locali,
  città. I numeri veri sono già nel HTML renderizzato dal server (leggibili senza
  JavaScript e indicizzabili); l'animazione parte solo quando la griglia entra
  nello schermo e viene **saltata del tutto** con `prefers-reduced-motion`.

## Decisioni tecniche

| Decisione | Perché |
| --- | --- |
| Vista dell'elenco nella URL, non in `useState` | Coerenza con ricerca e filtri: una vista è condivisibile, sopravvive alla paginazione e non si perde tornando indietro. In più il server può renderizzare la tabella, quindi resta indicizzabile |
| `scroll={false}` su cambio vista, filtri e ricerca | Chi sta guardando i filtri o l'elenco non deve essere riportato in cima alla pagina. Verificato: 1442 px prima e dopo |
| "In Evidenza" nascosto mentre si filtra | Un blocco editoriale sopra i risultati di una ricerca è rumore: chi cerca "druso" vuole le date del Druso, non la vetrina |
| Numeri nel HTML, animazione solo client-side | Il contatore non deve costare SEO né accessibilità: il valore finale c'è sempre, l'effetto è un di più |
| `getDiscoveryCounters` invariata (conteggi via RLS pubblica) | I numeri sono quelli che il pubblico può effettivamente vedere: oggi 3 eventi, 3 artisti, 1 locale, 1 città. Se un artista non ha date in programma non entra — e va bene così, la vetrina parla di ciò che è sulla mappa |

## Allineamento ai valori di OpenStage

| Valore | Come si vede in questo blocco |
| --- | --- |
| Underground e indipendente | Gli slot "In Evidenza" sono una scelta editoriale dichiarata ("scelte una per una, mai pagate"), non un'asta: nessuno può comprarsi il posto |
| Gratis per sempre | Il pannello "Gratis per sempre" sta nella stessa griglia delle due porte d'ingresso (artisti, locali): la promessa è accanto all'azione |
| Autenticità prima dell'hype | I contatori sono etichettati "Numeri veri" con la nota "nessuna stima, nessuna metrica di vanità", e vengono dal database a ogni caricamento |
| UX senza attrito | Cambiare vista o filtro non sposta la pagina: si guarda sempre quello che si stava guardando |

## Verifiche fatte

- **In locale**: bento completo (7 pannelli) con i contatori a 3 / 3 / 1 / 1;
  "In Evidenza" assente senza eventi marcati; passaggio a Tabella →
  `?vista=table` con 3 righe e 7 intestazioni corrette; `?when=month&vista=table`
  → 3 righe con il selettore su "Tabella" e la vetrina nascosta; scroll
  conservato sia cambiando filtro (847 → 847) sia cambiando vista (1464 → 1464);
  mobile 390 px senza trabocco orizzontale. Zero errori in console.
- **In produzione** (in italiano): `lang="it"`, titoli "Come funziona / Numeri
  veri / Per gli artisti / Per i locali / Gratis per sempre / Underground prima
  di tutto / Autenticità per design", contatori "3 Eventi in programma · 3
  Artisti · 1 Locali · 1 Città", tabella con date locali ("dom 18 ott · 18:00"),
  `?vista=table` con scroll invariato (1442 → 1442). Zero errori in console.
- `npm run build`: verde.

## Rischi e debito tecnico

| Voce | Gravità | Nota |
| --- | --- | --- |
| Nessun evento in evidenza | Bassa | La sezione è pronta ma vuota: serve la tua indicazione su quali serate mettere in vetrina (le marco io con una UPDATE, come per gli altri eventi reali) |
| Colonna "Artista" vuota quando il titolo è il nome dell'artista | Bassa | Coerente con le schede (regola `artistRepeatsTitle`), ma in tabella si nota di più. Si risolve quando gli eventi avranno un artista diverso dal titolo |
| Contatori = ciò che la RLS espone al pubblico | Bassa | Scelta voluta: nessun numero gonfiato da righe non visibili. Da ricordare se un giorno si vorranno "numeri di piattaforma" per la pagina Chi siamo |
| Nessun test automatico su vista tabella e contatori | Bassa | Verifica manuale con browser reale e script temporaneo, poi rimosso |

## Da riprendere

- Fase 2 è completa: manca solo la tua lista di eventuali eventi da mettere "In
  Evidenza".
- Backlog: pagina dei preferiti (B19), fuso del visitatore per i preset (B20),
  indici trigram nella ricerca (B21).
