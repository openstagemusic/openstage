# Piano — Multi-artista (lineup)

Stato: **deciso, da fare dopo il lancio**. Scritto il 2 novembre 2026.
Non è ancora implementato: oggi un evento ha **un solo** `artist_id`.

## Il problema

Una serata con tre band è la norma, non l'eccezione (Nuovi Suoni Live, Punk Rock
Raduno, qualsiasi apertura). Oggi:

- si può collegare **una** scheda artista per evento;
- le altre band non compaiono sulle loro pagine;
- l'artista collegato **può modificare** la serata del locale, perché la RLS lo
  considera proprietario. È sbagliato: in lineup ci si sta, non si amministra.

## Modello dati

```sql
create table public.event_artists (
  event_id    uuid not null references public.events (id) on delete cascade,
  artist_id   uuid references public.artists (id) on delete restrict,
  artist_name text,                 -- nome libero, per chi non ha scheda
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  primary key (event_id, artist_id),      -- quando c'è la scheda
  constraint event_artists_one_name check (
    (artist_id is null) <> (artist_name is null)   -- una delle due, non entrambe
  )
);
```

Vincoli:

- **una riga per artista** su un evento (niente doppioni);
- `artist_id` e `artist_name` sono alternativi: o la scheda o il nome scritto;
- `on delete restrict` sull'artista: non si cancella una scheda che ha date.

## Migrazione

1. Creare la tabella.
2. Copiare ogni `events.artist_id` esistente in una riga con `position = 0`.
3. `events.artist_id` resta come **artista principale** (compatibilità con widget,
   EPK e query esistenti), ma la verità è la tabella nuova.
4. Le date scritte nella descrizione non sono recuperabili: le prime serate
   multi-artista si sistemano a mano.

## Regole di chi fa cosa

| Chi | Può |
| --- | --- |
| **Locale** proprietario | creare la serata, aggiungere schede **e** nomi liberi, riordinare, rimuovere, annullare |
| **Artista che crea la serata** | una serata con **solo la sua scheda**; può aggiungere **nomi liberi**, non schede altrui |
| **Artista che trova la sua serata già creata** | **chiedere di entrare in lineup** (vedi sotto); non modifica niente finché non è approvato |
| **Artista in lineup** | non modifica niente. Può **uscire** («Non posso più suonare») e **chiedere una modifica** |
| **Admin** | tutto |

## Ingresso in lineup su richiesta (3 novembre 2026)

Il canale principale non è l'editor del locale, ma **l'artista che si aggancia a
una serata che esiste già**. Motivo: al lancio nessun locale ha reclamato la
scheda, quindi un editor in mano al locale non verrebbe usato da nessuno. Gli
artisti invece hanno un account e un interesse diretto.

### Il flusso

1. Sulla scheda evento compare **«Sono in questa serata»**, visibile **solo** a un
   utente loggato con una scheda artista, e **solo** se non è già in lineup e non
   ha creato lui l'evento. Per fan e anonimi il pulsante non esiste.
2. Chi lo tocca scrive una **nota breve** («sono il chitarrista dei X») e invia.
3. La richiesta entra in una **coda** con stato `pending` / `approved` / `rejected`,
   con notifica all'admin. **Nessuna approvazione automatica.**
4. Approvata: si crea la riga in `event_artists`. La serata compare sulla scheda
   dell'artista **senza duplicare l'evento**.
5. Da quel momento l'artista vede «Esci dalla lineup» e «Chiedi una modifica».

### Doppio consenso

Se l'evento ha un gestore con account (locale reclamato, o artista che l'ha
creato), la richiesta va **a lui**; l'admin resta il ripiego e vede comunque
tutto. Oggi i due ruoli coincidono, tra sei mesi no.

### Doppioni in creazione

Nel form «Crea serata», dopo locale + data, un controllo: se esiste già una
serata in quel locale quella sera, mostrarla con il pulsante **«Unisciti»**
prima di lasciar creare un doppione. Sotto, la via d'uscita: «Non la trovi?
Creala».

### Cosa questa richiesta NON è

- **Non dà permessi.** Essere in lineup non significa poter modificare,
  annullare o cancellare: resta a chi ha creato l'evento e al locale proprietario.
- **Non è automatica.** Un locale può inserire un artista famoso per attirare
  click: l'approvazione manuale è la difesa.
- **Non sostituisce l'editor.** Il locale reclamato deve comunque poter comporre
  la lineup da sé (schede + nomi liberi, riordino, rimozione).

### Schema della coda

```sql
create table public.event_join_requests (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  artist_id   uuid not null references public.artists (id) on delete cascade,
  message     text,
  status      text not null default 'pending',   -- pending | approved | rejected
  decided_by  uuid references public.profiles (id),
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (event_id, artist_id, status)           -- una sola richiesta aperta
);
```

Vincoli: una sola richiesta `pending` per coppia evento/artista; niente richieste
su eventi annullati o passati; se l'artista è già in lineup la richiesta viene
rifiutata in partenza.


Permessi: togliere dalla policy `events_update_own` la condizione
`artists.profile_id = auth.uid()` (l'artista collegato non gestisce più la
serata). La gestione resta a `created_by`, al proprietario del locale, all'admin.

## Fusione di eventi (duplicati)

La fusione resta **manuale**, solo admin.

**Quale evento resta (target), in ordine:**

1. quello collegato a un locale (`venue_id`);
2. se nessuno lo è ma il locale esiste su OpenStage → si collega il locale e il
   target è quello;
3. se il locale non esiste → il target viene **intestato all'admin**
   (`created_by`), non a un artista. La serata la gestisci tu; i tre artisti
   possono solo uscire.

**La fusione:**

- unisce le lineup (deduplica: chi era in due eventi resta una volta);
- ordina: prima la lineup del target, poi gli altri;
- sposta salvataggi e «vengo» sul target;
- il vecchio indirizzo continua a funzionare (`merged_into`);
- **non** fonde date diverse (una residenza non è un duplicato);
- **non** fonde stati diversi, salvo esplicita scelta: un annullato resta
  annullato.

## Le altre superfici da aggiornare

Non basta la scheda evento. Leggono l'artista singolo e vanno portate sulla
lineup:

- `components/events/EventPageView.tsx` → sezione **«Artisti»** con la lineup;
- `app/artisti/[slug]/page.tsx` → tutte le date in cui l'artista appare;
- `app/artisti/[slug]/epk/page.tsx` → stesse date;
- `app/widget/[kind]/[slug]/page.tsx` → lineup nel widget del locale;
- `app/dashboard/statistiche/page.tsx` → conteggi per artista in lineup;
- `lib/events/queries.ts` (`EVENT_SELECT`, `toPublicEvent`, liste per artista);
- `lib/dashboard/queries.ts` (`myEventFilters`: l'artista vede le serate in cui è
  in lineup).

## Comunicazione (senza queste, il resto è monco)

1. **Notifica quando ti aggiungono**: «sei stato aggiunto alla serata X del
   Locale Y», con il pulsante per uscire. Vale solo per artisti con account.
2. **«Non posso più suonare»**: auto-rimozione immediata dalla lineup; notifica
   al gestore della serata; se la lineup si svuota, la serata va in «da
   controllare» all'admin (non si cancella da sola).
3. **«Chiedi una modifica»**: messaggio contestualizzato (evento, artista, cosa
   cambiare) nella coda admin o del locale.
4. **Notifiche estese**: annullamento e spostamento vanno notificati a **tutta la
   lineup**, non solo a chi aveva salvato la serata.

## Riconciliazione e duplicati di schede

- **Nome libero → scheda**: quando un artista reclama la scheda, proporre di
  collegare le voci testuali con il suo nome e città alle sue date. Senza questo,
  chi era già in lineup non vede niente sulla propria pagina.
- **`merge_artist`**: due schede per la stessa persona vanno fuse (come per gli
  eventi), altrimenti la directory mostra due «Mario».

## Casi limite accettati

- **Festival multi-sede**: un evento ha un solo locale. O si crea un evento per
  sede, o si sceglie la sede principale.
- **Ruolo unico**: un artista non può gestire un locale. Se organizza in un posto
  senza scheda, resta `venue_name` testuale.
- **Artista senza account**: non riceve notifiche e non può uscire da solo.
  Rimozione su richiesta via contatti.
- **Abuso**: un locale può inserire un artista famoso per attirare click. Rimedi:
  auto-uscita, segnalazione, intervento admin.

## Ordine di lavoro

1. Migrazione `event_artists` + copia da `artist_id` + policy corretta.
2. Query e tipi (`EventRow`, `toPublicEvent`, liste per artista, dashboard).
3. **Richiesta di ingresso in lineup**: pulsante sulla scheda, tabella
   `event_join_requests`, coda admin, azione di approvazione.
4. **Controllo «serata già esistente» nel form di creazione**, con «Unisciti».
5. Scheda evento: sezione «Artisti»; scheda artista ed EPK con tutte le date.
6. Editor lineup per il locale reclamato (schede + nomi liberi, riordino, rimozione).
7. Widget e statistiche.
8. Notifiche (aggiunta, uscita, annullamento a tutta la lineup).
9. Pulsanti «Non posso più suonare» e «Chiedi una modifica».
10. `merge_event` con unione lineup e intestazione admin quando serve.
11. `merge_artist` e riconciliazione al claim.

Stima: **2–3 giorni** per i punti 1–5; altri 1–2 per il resto. La coda delle
richieste (3–4) costa più di un form, ma è l'unica parte che funziona **senza**
locali reclamati.

## Criterio di «fatto»

- Una serata con tre band mostra le tre schede e compare su tutte e tre.
- Un artista trova una serata già creata, chiede di entrare, l'admin approva: la
  serata compare sul suo profilo **senza duplicare l'evento**.
- Il pulsante «Sono in questa serata» non è visibile a fan, anonimi, a chi è già
  in lineup e a chi ha creato l'evento.
- L'artista in lineup **non** può modificare la serata; il locale sì.
- Una fusione di tre eventi produce un evento con tre artisti, senza duplicati.
- Widget, EPK e statistiche mostrano la lineup, non solo il primo artista.
- Chi viene aggiunto riceve una notifica e può uscire da solo.
