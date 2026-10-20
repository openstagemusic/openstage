# Fase 4 — Qualità dei dati e moderazione (piano)

> **Prossimo blocco dopo la Fase 3**, che è costruita e in produzione. La roadmap completa delle fasi
> 4 → 13 è in `docs/roadmap.md`. Nessuna riga di codice prima del via libera esplicito: la fase apre
> con il parere critico e la lista dei servizi esterni in chat (`AGENTS.md`).

## Contenuto: tre lavori, in quest'ordine

### 4.1 — B38 · Qualità della posizione

Oggi `search_events` usa **solo il centro del pin**: un evento "±3 km" il cui centro è appena fuori dal
raggio richiesto non compare, anche se la zona comprende chi cerca. La città è **testo libero** e le
liste dei filtri nascono dai valori distinti ("milano" e "Milano" = due città). Manca un controllo che
il pin cada su un posto reale.

- Città **derivata dal pin** con chiave normalizzata (riuso della geocodifica inversa già presente,
  con la cache `geocode_cache`).
- Filtro di distanza **onesto** per gli eventi approssimativi: chi cerca dentro il raggio deve vedere
  gli eventi la cui **zona** lo comprende, non solo quelli il cui centro è dentro.
- **Confronto con la città dichiarata**: avviso oltre ~50 km, rifiuto oltre ~300 km.
- Pin **impossibile rifiutato**: la geocodifica inversa non restituisce nulla (mare aperto) → blocco.
- Campo breve **"come arrivare"** per centri sociali, loft, cortili, spiagge, mostrato nella pagina
  evento.

### 4.2 — B39 · Serate collegate

Oggi `artist_id` lo decide il server = la scheda di **chi crea**: un evento inserito da un locale ha
`artist_id` nullo e **non comparirà mai** sulla pagina dell'artista. Quando l'artista si registra e
crea la stessa serata nascono due righe.

- Il modulo del **locale** collega una scheda artista esistente.
- **Rilevamento all'ingresso** con avviso ("esiste già questa serata: [Vedi] [Crea comunque]"), mai
  blocco: due set la stessa sera nello stesso locale sono legittimi (decisione congelata).
- **Unione** solo come gesto dell'**admin**: `merged_into`, reversibile, con la pagina che rimanda e i
  Preferiti spostati (decisione congelata).

### 4.3 — B40 · Moderazione dopo la pubblicazione

L'admin ha già i permessi in RLS su tutti gli eventi ma **non l'interfaccia**: oggi vede solo bozze e
reclami, quindi un account **verificato** che pubblica serate false non passa da nessuna coda. Il
database è pronto per la sospensione (`profiles.suspended_at`, dalla 3.3.4), manca il pulsante.

- Pannello degli eventi **pubblicati** (filtri, sospensione, annullamento).
- **"Segnala"** pubblico (tabella `reports` nuova).
- Visibilità ridotta **solo** per gli account segnalati (es. max 2 serate in Home), **mai** per tutti:
  sarebbe una punizione arbitraria per chi pubblica un weekend intero.
- Collegato a **B26** (rifiutare una bozza con un motivo), che richiede le email: si chiude in Fase 7.

**Punto aperto, da decidere prima di costruire**: l'auto-nascondimento a 3 segnalazioni. Tre account
possono nascondere un evento sano. Proposta: 3 segnalazioni **da utenti diversi e verificati** →
l'evento è segnato per revisione e sospeso **temporaneamente**, con notifica all'artista e decisione
finale dell'admin.

## Servizi esterni e variabili

**Nessuno nuovo.** Niente Resend, niente PayPal, niente chiavi. Solo migration Supabase (città
normalizzata e "come arrivare" per B38, `merged_into` per B39, `reports` per B40) e prove in
produzione come per le fasi precedenti.

## Stato di avanzamento

### 4.1 — B38 · fatto (migration `0024`, applicata)

Cosa è entrato davvero:

- `public.city_key(text)` (immutabile) e le colonne **generate** `city_key` su `events`, `artists`,
  `venues`: "Milano", "milano" e "Milano (MI)" sono la stessa città, per sempre, perché le calcola il
  database. La stessa regola è copiata in `lib/geo/city.ts` per i filtri che partono dalla URL.
- Menu dei filtri e contatori **deduplicati** per chiave (`listCities`, `listCityOptions`,
  `getDiscoveryCounters`): una voce per città vera, con l'etichetta scritta più spesso.
- Raggio **onesto** in `search_events`: si misura la distanza dal **bordo** della zona
  (`distanza − area_radius_m`), non dal centro. Provato con due eventi gemelli a 2 km dal centro e
  raggio richiesto 1 km: passa solo quello approssimativo con zona di 3 km.
- `lib/geo/location-check.ts`: geocodifica inversa **tri-stato** (`found` / `empty` / `unavailable`),
  confronto pin↔città (avviso oltre 50 km, rifiuto oltre 300 km). `empty` = pin sul mare, rifiutato;
  `unavailable` = Photon giù, **non** si blocca nessuno.
- Rotta `/api/geocode` con `?city=`: risponde anche con `locationCheck` (una sola geocodifica inversa,
  non due in parallelo: Photon rallentava).
- Editor: avviso morbido mentre si compila; il salvataggio rifà il controllo con un budget di 3 s
  (`SAVE_CHECK_TIMEOUT_MS`) e blocca solo `empty` / `impossible`.
- `GEOCODER_TIMEOUT_MS` (opzionale): serve alle prove locali, dove Photon impiega 4–7 s. In produzione
  resta 5 s.
- Il campo **"come arrivare"** esisteva già dalla `0023` (`directions_text`, mostrato nella pagina
  evento): verificato, non riscritto.

Prove reali (browser, sessione vera, `next start`): mare → `empty`; pin a Berlino con città "Milano"
→ `impossible`; pin a Ranica → `ok`; rotta senza sessione → 401; menu città con **una sola** voce per
"milano"/"Milano (MI)"; filtro `?city=milano` e vecchia URL `?city=Milano (MI)` trovano le stesse
schede. Fixture e utente di prova eliminati dopo il test.

Copertura onesta: il blocco lato **salvataggio** usa lo stesso codice della rotta ma con 3 s di budget;
su questa rete Photon impiega più di 3 s, quindi il blocco è stato provato sulla rotta (budget pieno) e
non attraverso il pulsante "Pubblica". In produzione la latenza è nell'ordine dei decimi di secondo.

### 4.2 — B39 · fatto (migration `0025`, applicata) — manca il pulsante admin

- **Il locale collega l'artista**: campo "Artista della serata" con ricerca su `/api/artists`
  (sessione richiesta). Il server accetta `artistId` **solo** se chi scrive non è un artista: chi ha
  una scheda scrive sempre a nome proprio, nessuno può attribuirsi un concerto. Un artista vede la
  propria scheda già collegata e non modificabile.
- **Avviso doppioni**: prima di creare, `findSimilarEvents` cerca stesso giorno **e** almeno una cosa
  in comune vera (stesso locale, stesso artista, stesso titolo). Se trova qualcosa il salvataggio si
  ferma **senza errore** e risponde con `duplicates`: il modulo mostra "Esiste già una serata simile"
  con [Vedi] e [Crea comunque]. Il secondo invio passa `confirmDuplicate: true`.
- **Unione admin** (`merge_event`/`unmerge_event`, `security definer`, permesso `admin` controllato
  **dentro** la funzione): la scheda doppione diventa `cancelled`, conserva `merged_status`, punta a
  quella buona con `merged_into`, i Preferiti si spostano. La pagina pubblica risponde **308** verso la
  destinazione; `unmerge` riporta la scheda allo stato di prima.

Prove reali: utente "venue" di prova creato via Auth vero, serata creata dal modulo con l'artista
"Sick Tamburo" collegato (`artist_id` scritto in tabella), seconda serata identica → avviso mostrato e
"Crea comunque" che crea davvero; unione via RPC con claim admin → `cancelled` + `merged_into` +
Preferito spostato; `curl` sulla pagina del doppione → `308 /it/eventi/ranica/test-b39-serata-collegata`;
separazione → stato `draft` ripristinato. Utente, serate, preferiti e righe `event_creations` eliminati.

Copertura onesta: il **pulsante** di unione nell'interfaccia admin arriva con il pannello di 4.3 (la
funzione è provata via RPC); l'avviso doppioni non è stato provato con un titolo diverso e stesso
locale/artista (stessa strada, stesso codice).

### 4.3 — B40 · fatto (migration `0026`, applicata)

Cosa è entrato:

- **Tabella `reports`**: una segnalazione per persona per serata (`unique (event_id, reporter_id)`),
  motivi chiusi (`fake`, `wrong_info`, `spam`, `offensive`, `other`), nota facoltativa, stato
  (`open`/`resolved`/`dismissed`). RLS: si inserisce solo a nome proprio, si legge solo la propria o
  da admin, si aggiorna solo da admin.
- **«Segnala questa serata»** in fondo alla scheda evento, per chi ha una sessione e solo su serate in
  programma. Non è una recensione: chiede un motivo e arriva solo all'admin. La seconda segnalazione
  della stessa persona non entra (lo dice la chiave) e l'interfaccia lo dice.
- **Auto-nascondimento morbido**: alla **terza** segnalazione da persone **diverse e verificate** la
  serata torna in bozza (`auto_hidden_at`, `auto_hidden_status` conserva lo stato di prima). Non è una
  condanna e non tocca l'account: è una pausa che aspetta una persona.
- **Pannello `/admin/eventi`** (link dalla coda): tutte le serate pubblicate e in pausa, con autore,
  numero di segnalazioni aperte e filtri (Tutte / Online / In pausa / Segnalate). Azioni: annullare,
  rimettere online (chiude anche la pausa), tornare in bozza, sospendere o riattivare l'autore, unire
  un doppione indicando indirizzo, slug o identificativo.
- **Nessuna penalità sull'account per chi pubblica tanto**: la pausa è per **serata**, non per autore.
  Se le segnalazioni mostrano un comportamento sistematico, l'admin sospende l'account a mano. È una
  scelta diversa dall'esempio «max 2 serate in Home» del piano: punire l'intero catalogo per una serata
  contestata sarebbe la cosa che OpenStage non vuole essere.
- `merge_event`/`unmerge_event` (0025) ora usano `public.is_admin()` — la stessa regola di tutta la
  moderazione — invece di `profiles.role` (migration `0027`): due definizioni di admin sono una di
  troppo.

Prove reali (utenti Auth veri, `next start`): segnalazione inviata dalla scheda con motivo e nota →
riga in `reports`; secondo invio → «Hai già segnalato questa serata»; due segnalazioni in più da
persone verificate → serata **in pausa** (`draft` + `auto_hidden_at` + `auto_hidden_status=published`);
pannello admin → «3 segnalazioni» e «In pausa», **Rimetti online** → Online e pausa chiusa, **Annulla** →
Annullata, di nuovo **Rimetti online** → Online. Le altre serate non sono state toccate (verificato in
tabella). Account, serata di prova, segnalazioni e righe collegate eliminati; `settings.admin_email`
riportato al proprietario.

Copertura onesta: il pulsante **Unisci** è stato provato via RPC (4.2) e non cliccato nel pannello; la
soglia delle tre segnalazioni è provata inserendo le righe in SQL (la funzione scatta allo stesso modo);
la sospensione dell'autore è stata resa visibile dal pannello ma non cliccata nel test.
