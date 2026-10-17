# Revisione Fase 3.2.2 — "Non reclamato" smette di essere un campo salvato

Data: 17 ottobre 2026 · Migration: `0013_event_unclaimed_derived.sql` · Commit: "Fase 3.2.2"

---

## 1. Cosa ha visto l'utente

Dopo aver approvato il reclamo della scheda di **Bobo Rondelli**, in Supabase la riga dell'evento
aveva ancora `events.is_unclaimed = true`.

La segnalazione è corretta, e il difetto è mio: nel piano della Fase 3 (migration `0009`) avevo
scritto *"ridefinizione di `is_unclaimed` come «nessuno dei soggetti collegati ha reclamato»"*, ma
non l'ho mai fatto.

## 2. Diagnosi (verificata sul database, non dedotta)

`events.is_unclaimed` era un residuo della **Fase 1** (`0001_init.sql`): un valore **salvato**
sull'evento al momento dell'inserimento ("questo evento l'ha messo OpenStage prima che la scheda
fosse reclamata").

Due fatti controllati uno per uno:

1. **Nessuno lo aggiornava.** Nessun trigger su `events`, `artists`, `venues` lo tocca (elenco
   trigger letto da `pg_trigger`): l'unico posto dove compariva era la colonna, più la funzione
   `search_events` che lo restituiva. Nel codice dell'app c'erano **solo letture**
   (`lib/events/queries.ts`), zero scritture.
2. **Non è mai stato "ridefinito".** La promessa del piano non era nel codice.

Conseguenza pratica: il valore era una **fotografia della Fase 1**, che non seguiva più la realtà.
Chi reclamava una scheda non cambiava niente, quindi la nota *"Evento inserito da OpenStage, non
ancora rivendicato dal locale"* restava anche dopo il reclamo — e sarebbe rimasta **per sempre**,
anche dopo il reclamo del locale.

## 3. La regola, e una precisazione onesta sulla scelta

La regola applicata è quella decisa nel piano: un evento è "inserito da OpenStage" quando
**nessuna** delle due schede collegate è stata reclamata, cioè

```
is_unclaimed = (esiste almeno una scheda) && artista.profile_id is null && locale.profile_id is null
```

Quindi **basta un reclamo** (dell'artista *o* del locale) e la nota sparisce. È anche la lettura che
l'utente si aspettava: reclamato Bobo Rondelli, il suo evento non è più "di OpenStage".

> **Da mettere a verbale**: nella domanda in chat l'etichetta diceva "Né locale né artista" (questa
> regola) ma la descrizione sotto diceva *"la nota compare finché una delle due schede è ancora
> libera"* (la regola opposta). Le due frasi si contraddicevano: ho implementato **l'etichetta**,
> perché è la regola scritta nel piano e quella coerente con quanto l'utente si aspettava. Se si
> preferisce l'altra lettura (nota finché **una** delle due resta libera), si cambia una riga in
> `toPublicEvent` e il testo della nota.

Un evento **senza** artista e **senza** locale non ha nessuna scheda da reclamare: la nota non
compare (non avrebbe senso invitare a reclamare qualcosa che non esiste).

## 4. Cosa è cambiato

**Database — `supabase/migrations/0013_event_unclaimed_derived.sql`**

- `alter table public.events drop column if exists is_unclaimed;` — la seconda verità sparisce, così
  nessuno può più scriverla (chi proverà a inserirla riceverà un errore: è voluto).
- `search_events` **eliminata e ricreata** (in PostgreSQL `create or replace` non può cambiare le
  colonne di ritorno): via `is_unclaimed`, dentro i `profile_id` di artista e locale nei due
  `jsonb`. Permessi verificati dopo la ricreazione: `anon` ✅, `authenticated` ✅.

**Applicazione**

| File | Cambiamento |
| --- | --- |
| `lib/events/queries.ts` | `EVENT_SELECT` non legge più `is_unclaimed` e chiede `profile_id` alle due schede; `isUnclaimed` si **calcola** in `toPublicEvent` (un posto solo per elenco, mappa, home e pagina evento) |
| `lib/events/types.ts` | Commento aggiornato al campo `isUnclaimed` (è un fatto delle schede) |
| `i18n/dictionaries/it.ts`, `en.ts` | `unclaimedNote`: *"Evento inserito da OpenStage: il locale e l'artista non hanno ancora reclamato la scheda."* / *"Event added by OpenStage: the venue and the artist have not claimed their page yet."* |

## 5. Prove

**Sul database** (dopo la migration): colonna assente ✅ · `search_events` richiamabile da `anon` e
`authenticated` ✅ · i due `profile_id` arrivano nel risultato ✅ (Bobo Rondelli: artista reclamato,
`locale_profilo` nullo).

**Sulle pagine** (`next start -p 3100`, lettura dell'HTML renderizzato — la nota è nel server-side):

| Caso | Atteso | Esito |
| --- | --- | --- |
| `/eventi/ranica/bobo-rondelli` — artista reclamato | nessuna nota | ✅ |
| `/eventi/ranica/sick-tamburo` — entrambe le schede libere | nota presente | ✅ |
| `/eventi/ranica/pierpaolo-capovilla-e-i-cattivi-maestri` — libere | nota presente | ✅ |
| evento di prova con schede **libere** | nota presente | ✅ |
| stesso evento, **artista** reclamato (locale libero) | nota assente | ✅ |
| stesso evento, **locale** reclamato (artista libero) | nota assente | ✅ |
| stesso evento, entrambi reclamati | nota assente | ✅ |
| evento di prova **senza** schede | nota assente | ✅ |

Gli eventi di prova (due eventi, una scheda artista, una scheda locale, un profilo sintetico) sono
stati **creati e rimossi** nella stessa sessione: a fine prova il database reale è tornato a
6 artisti, 1 locale, 3 eventi, nessun profilo di prova, come verificato con una query di controllo.

## 6. Cosa **non** è cambiato (e va detto)

- Il **badge "Non reclamato"** delle directory (`/artisti`, `/locali`, schede) non ha mai usato la
  colonna: nasce già da `profile_id`. Nessun effetto.
- La **nota non compare nella home**: la lista usa `EventTeaser`/`EventTable`, che non l'hanno mai
  mostrata; la mostrano la pagina evento e la card della mappa. Non è una regressione, ma è una
  incoerenza da decidere → **B32** in `docs/backlog.md`.
- Il **manuale** (capitolo tecnico) elenca ancora `is_unclaimed` fra le colonne di `events`: si
  aggiorna quando si rimetterà mano al manuale, come da accordo.
