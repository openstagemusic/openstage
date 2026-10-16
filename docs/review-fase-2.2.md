# Review Fase 2.2 — Ricerca, filtri rapidi e mappa sincronizzata

Blocco 2.2 della Fase 2. Chiude il pezzo "trova quello che cerchi" della Home:
barra di ricerca con suggerimenti live, filtri rapidi e una sola fonte di verità
per lista e mappa.

## Cosa funziona

- **Barra di ricerca con suggerimenti raggruppati**: digitando almeno 2 lettere
  compare un elenco diviso per tipo (città, artisti, locali, generi, eventi).
  Navigazione da tastiera (frecce, Invio, Esc), chiusura al clic fuori, stato
  "nessun suggerimento". Ogni suggerimento porta a un evento **in programma**:
  nessun vicolo cieco.
- **Suggerimenti dal nostro database**: nessun geocoder esterno. Se un artista o
  un locale non è su OpenStage, non compare — che è esattamente il messaggio che
  vogliamo dare ("segnalalo e riempiamo la mappa").
- **Scegliere un suggerimento è utile davvero**: una città, un artista o un
  locale diventano una ricerca (`?q=`), un genere diventa il filtro genere
  (`?genre=`), un evento apre la sua pagina.
- **Filtri rapidi**: Stasera, Questo weekend, Questa settimana, Prossimi 30
  giorni, Ingresso gratuito, Genere, Tipo di evento, Distanza (10/25/50/100/250
  km). I generi proposti sono quelli **realmente presenti** negli eventi
  pubblicati, non una lista fissa.
- **Tutto vive nella URL**: ogni filtro scrive in `searchParams`, quindi una
  ricerca è condivisibile e la pagina resta renderizzata dal server. Passando da
  Home a `/mappa` (e viceversa) i filtri viaggiano con te.
- **Lista e mappa non possono divergere**: entrambe leggono gli stessi parametri
  e passano dalla stessa funzione SQL. Il contatore dei pin ("3 eventi sulla
  mappa") e l'elenco sotto raccontano sempre la stessa storia.
- **Stato vuoto onesto**: con filtri attivi il messaggio è "Nessun evento con
  questi filtri" con il pulsante per azzerarli, non l'invito a segnalare un
  locale (che sarebbe fuorviante).
- **Paginazione che non perde i filtri**: cambiando pagina i filtri restano nella
  URL e si torna all'elenco (`#eventi`).

## Decisioni tecniche

| Decisione | Perché |
| --- | --- |
| Ricerca, filtri e raggio in una funzione SQL (`search_events`) invece dei filtri del client Supabase | La ricerca deve attraversare anche `artists.name` e `venues.name` (col client servirebbero due query da incrociare a mano); il raggio è una distanza geografica e va applicato **prima** del taglio di pagina, altrimenti "le 12 più vicine" non è vero; e una sola funzione impedisce che lista e mappa divergano |
| Funzioni `SECURITY INVOKER` con filtro esplicito su `status = 'published'` | La RLS resta quella delle tabelle: nessun permesso nuovo, nessun `SECURITY DEFINER` da controllare |
| Carattere di escape `!` nei pattern LIKE | Il testo digitato non può introdurre jolly (cercare "%" cerca un "%", non tutto). Verificato: `p_query => '%'` restituisce 0 righe |
| Preset calcolati nel fuso `Europe/Rome` (`lib/events/timezone.ts`) | I confini di giornata passano da `Intl`, non da somme di millisecondi: al cambio di ora legale la finestra non si sposta di un'ora. La piattaforma è italo-centrica, quindi il riferimento è Roma (documentato, non nascosto) |
| "Stasera" = l'intera giornata odierna, non solo il futuro | Gli eventi non hanno un'ora di fine: un concerto iniziato un'ora fa è ancora la serata di oggi. Meglio mostrare qualcosa in più che nascondere uno spettacolo in corso |
| Il raggio ha bisogno di un centro, e il centro entra nella URL (`lat`/`lng`) | Senza centro il filtro non è riproducibile. Il centro predefinito è la zona del visitatore (dai geo-header, senza chiedere permessi); la posizione precisa resta il pulsante "Vicino a me" |
| Suggerimenti via `/api/suggest` (`no-store`) | Il testo è digitato dall'utente e cambia a ogni tasto: la cache qui non serve e confonderebbe |

## Allineamento ai valori di OpenStage

| Valore | Come si vede in questo blocco |
| --- | --- |
| Underground e indipendente | La ricerca è **interna**: gli artisti emergenti non competono con i grandi nomi di un motore esterno, e chi è su OpenStage è l'unico che si trova |
| Gratis per sempre | Nessun servizio di ricerca a pagamento, nessuna quota, nessuna chiave: la ricerca è una funzione del nostro Postgres |
| Autenticità prima dell'hype | I suggerimenti sono ordinati per pertinenza reale (somiglianza del nome, numero di date in programma), non per popolarità acquistata. I filtri dicono la verità: "Stasera" senza eventi oggi mostra zero, non riempie il vuoto |
| UX senza attrito | Un filtro è un tocco, non un modulo da compilare; la ricerca non ricarica la pagina e la URL resta condivisibile |

## Verifiche fatte

- **In locale** (`npm start`, Chrome headless): 3 eventi in Home; suggerimenti per
  "tamburo" (artisti + eventi, raggruppati) e per "druso" (locali); scelta di un
  suggerimento → `?q=Sick+Tamburo` con 1 risultato; `?when=tonight` → 0 risultati
  con lo stato vuoto corretto; `?when=month` → 3; `?when=weekend` → 1 (solo la
  data di domenica); `?q=druso` e `?q=ranica` → 3; `?genre=Indie+rock` → 1;
  `?free=1` → 0; `/mappa?q=druso` → "3 eventi sulla mappa" con ricerca e filtri
  sovrapposti. Nessun errore in console, nessun trabocco orizzontale a 390 px.
- **In produzione** (`openstage-alpha.vercel.app`, in italiano): pagina `lang="it"`,
  chip e segnaposto in italiano, suggerimento "LOCALI · Druso · Ranica", scelta →
  "3 risultati · Risultati per “Druso”", "Prossimi 30 giorni" → 3, genere Indie
  rock → 1, "Stasera" → stato vuoto in italiano, `/mappa?q=druso` → "3 eventi
  sulla mappa". Zero errori in console.
- **SQL**: `search_events` e `search_suggestions` provate con i dati reali
  (raggio 25 km da Ranica → 3; da Roma → 0; pattern "%" → 0; `only_located` → 3).
- `npm run build`: verde.

## Rischi e debito tecnico

| Voce | Gravità | Nota |
| --- | --- | --- |
| Preset temporali ancorati a `Europe/Rome` | Bassa | Un visitatore in un altro fuso vede "Stasera" come la serata italiana. Coerente con una piattaforma italo-centrica; se in futuro servirà il fuso del visitatore, il punto di modifica è uno solo (`lib/events/timezone.ts`) |
| Raggio centrato sulla posizione IP | Bassa | La posizione da rete è a livello di città: per 10-25 km l'errore può spostare il risultato. Il centro è nella URL e la posizione precisa resta "Vicino a me" |
| `search_events` non usa ancora gli indici trigram per il titolo | Bassa | Con volumi piccoli è irrilevante. Da rivedere quando gli eventi saranno migliaia (il piano lo prevedeva) |
| Nessun test automatico su ricerca e filtri | Bassa | Verifica manuale con browser reale e script temporaneo, poi rimosso. Da rendere ripetibile con i test end-to-end |
| Suggerimenti senza cache | Bassa | Una richiesta per pausa di digitazione, annullata se si continua a scrivere. Con molto traffico si potrà valutare una cache breve |

## Da riprendere

- Blocco 2.3: showcase con selettore Schede/Tabella, 3 slot "In Evidenza"
  (`is_featured`), bento promozionale con i contatori reali (`getDiscoveryCounters`).
- Il pulsante "Salva" resta senza una pagina dei preferiti (backlog).
- Le pagine `/artisti` e `/locali` sono ancora segnaposto: la ricerca ora sa
  trovarli, ma non hanno una scheda propria.
