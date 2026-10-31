# Fase 12 — Serie, locali chiusi, bacheca ingaggi

Stato: **in corso**. Ordine confermato il 31 ottobre 2026.

Regole che valgono per tutto il blocco: stesse linee del design system (nessun
riquadro, campi `.os-field`, un solo primario per vista), zero servizi esterni
nuovi, zero pay-to-play, notifiche solo in-app.

---

## 12.1 — Locale chiuso (fatto)

**Perché per primo:** un locale che chiude oggi lascia online serate che non
esistono più, e la mappa manda gente davanti a una saracinesca.

- `venues.closed_at`, `venues.closed_note` (nota pubblica, max 280).
- **Chiudere** (`closeVenueAction`): mette la data, salva la nota e **annulla** le
  serate future pubblicate con motivo «Locale chiuso — nota». Restano leggibili
  come archivio; il trigger `notify_event_cancelled` avvisa chi le aveva salvate.
- **Riaprire** (`reopenVenueAction`): toglie data e nota. Le serate restano
  annullate finché non si rimettono in programma a mano (nessuna resurrezione
  automatica).
- Scheda pubblica: tag «Chiuso» accanto al nome, nota con filo rosa, blocco
  contatti che spiega perché non c'è il pulsante.
- Directory `/locali`: i locali chiusi non compaiono (la pagina resta
  raggiungibile e indicizzabile come archivio).
- Creazione eventi: bloccata nell'interfaccia **e** nell'azione di salvataggio
  (`closedVenue`), così un modulo vecchio aperto in una scheda non scrive.
- Account del locale: sezione «Stato del locale» con chiusura/riapertura.

---

## 12.2 — Bacheca ingaggi (fatta)

Una chiamata è un annuncio di un locale (o di un artista) che cerca una figura
per una data o un periodo. Non è un mercatino: pochi annunci, verificati, con
scadenza.

**Fatto il 31 ottobre 2026**, con le regole decise insieme: tetto di candidature
scelto dall'autore e modificabile in corsa, chiusura anticipata, candidatura come
thread di booking, compenso dichiarato, scadenza automatica.

**Modello**

- `calls`: `id`, `venue_id` / `artist_id` (uno dei due), `created_by`, `title`,
  `body`, `role_wanted`, `city`, `period_start`, `period_end`, `fee_text`,
  `compensation_type` (`paid` | `door_split` | `unpaid` | `tbd`),
  `max_applications` (1–50, scelto dall'autore), `status`
  (`open` | `closed` | `expired`), `expires_at`, `closed_at`, `created_at`.
- Contatore candidature: si calcola dai thread collegati, non si memorizza un
  numero che può divergere.
- `booking_threads.call_id` (nullable): la candidatura **è** un thread di
  booking, con tutto quello che abbiamo già (stati, note, promemoria, inbox,
  export).

**Regole**

- Possono pubblicare solo schede reclamate e **verificate**.
- Compenso obbligatorio: `paid` richiede `fee_text`; `unpaid` deve essere
  dichiarato in chiaro (niente «compenso da definire» per nascondere lavoro
  gratis).
- Una sola chiamata aperta per scheda; `expires_at` massimo 60 giorni.
- Chiusura anticipata quando si trova la persona giusta: `status = closed`,
  sparisce dagli elenchi, le candidature restano.
- Il tetto `max_applications` blocca le candidature quando è raggiunto; si può
  alzare in corsa dalla dashboard.
- Candidatura: si apre un thread di booking collegato (`call_id`), con un
  messaggio iniziale precompilato. Nessun contatto fuori dal sistema.
- `noindex` su ogni annuncio: sono temporanei, la pagina che si indicizza è `/calls`.

**Interfaccia**

- `/calls` pubblica: filtri testuali (città, ruolo, compenso), righe editoriali,
  nessuna card.
- Dettaglio chiamata: testo, periodo, compenso, stato, candidature ricevute
  (solo per l'autore), CTA «Candidati» per l'altro ruolo.
- Dashboard: `/dashboard/chiamate` con elenco, tetto candidature modificabile,
  chiusura anticipata, link ai thread.
- Moderazione: filtro nella coda admin, segnalazione già esistente.

---

## 12.3 — Serie e festival (dopo)

Solo multi-giorno, **nessuna ricorrenza automatica**.

- `events.ends_at` (nullable) + vincolo `ends_at >= starts_at`.
- Editor: interruttore «Dura più giorni»; se spento resta la data singola.
- Visualizzazione: «dal 12 al 14 giugno» in liste, mappa, scheda, ICS e widget.
- `events.series_id` solo come raggruppamento editoriale (edizione di un
  festival), nessuna generazione di date.
- Pulizia: gli eventi multi-giorno non vengono considerati «conclusi» fino al
  giorno dopo `ends_at`.

---

## Servizi e ambiente

Nessuno nuovo: Supabase, notifiche in-app, Turnstile, storage esistente.
**Nessuna env var**, nessun piano a pagamento, nessuna email transazionale.

## Migrazioni

- `0068_venue_closed.sql` — fatta.
- `0069_calls.sql` — chiamate, candidature collegate al booking.
- `0070_event_ends_at.sql` — multi-giorno.

## Test minimi per ogni blocco

- Chiusura: serate future annullate, passate intatte, contatto spento, locale
  fuori dalla directory, riapertura che non resuscita nulla.
- Chiamate: tetto raggiunto, chiusura anticipata, scadenza, candidatura che
  finisce nella inbox, export.
- Multi-giorno: ricerca «stasera»/«questo weekend», mappa, ICS, widget.
