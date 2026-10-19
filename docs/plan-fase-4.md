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
