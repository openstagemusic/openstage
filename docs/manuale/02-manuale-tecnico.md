# Architettura e stack

OpenStage è una **applicazione web Next.js** (App Router, TypeScript) renderizzata **lato
server** su tutte le pagine pubbliche: ogni pagina arriva già composta, così SEO e anteprime
social funzionano sempre e non esiste una "SPA" vuota da riempire nel browser.

| Pezzo | Tecnologia | Versione | Perché |
| --- | --- | --- | --- |
| Framework | Next.js (App Router) | 15.5.28 | SSR ovunque, server actions, ottimo su Vercel |
| UI | React | 19.1.0 | Richiesto da Next 15 |
| Linguaggio | TypeScript | 5.x | Errori presi prima del deploy |
| Stile | Tailwind CSS | v4 | Utility-first, tema custom con i token del brand |
| Animazioni | CSS + `IntersectionObserver` | — | Reveal, stagger e hover leggeri. **Framer Motion** è stato valutato in Fase 5 e rimandato alla Fase 13: per un fade aggiungeva ~45 KB gzip |
| Database + Auth | Supabase (Postgres) | eu-north-1 | RLS nativa sull'`auth.uid()`; un solo fornitore per dati e login |
| Anti-bot | Cloudflare Turnstile + Supabase Auth | — | Captcha su registrazione, login e reset; la verifica `siteverify` è lato Supabase |
| Mappe | MapLibre GL JS + **OpenFreeMap** | 6.14.0 | Mappa e globo degli eventi: **nessuna chiave API, nessun account** (Fase 2) |
| Email | Resend + Aruba | — | Invio transazionale `eu-west-1`; ricezione sulle caselle Aruba (`noreply@`, `ciao@`) |
| Pagamenti | PayPal | *in arrivo* | Solo funzioni opzionali: il piano base resta gratuito |
| Hosting | Vercel | Hobby | Deploy continuo da GitHub |
| Repository | GitHub | `openstagemusic/openstage` | Ramo principale `main` |

## Alternative valutate e perché sono state scartate

| Alternativa | Motivo del no |
| --- | --- |
| Neon + Clerk | Due fornitori da configurare, e Clerk non ha RLS sul database: la sicurezza dei dati va riscritta a mano nell'app |
| Nhost / Appwrite / Firebase | Livello database meno "Postgres puro" (o NoSQL): vincoli, viste e policy SQL perdono potenza |
| Turso | SQLite distribuito: ottimo per altri casi, ma qui serve Postgres con RLS nativa |
| Supabase | **Scelto**: Postgres con Row Level Security collegata all'utente loggato, Auth integrata, piano gratuito ampio |
| MapTiler | **Scartato in Fase 2**: richiede account e chiave API. OpenFreeMap non chiede né l'uno né l'altro, consente l'uso commerciale e si "paga" con l'attribuzione obbligatoria |
| Globe.gl | **Scartato in Fase 2**: la proiezione "globo" è nativa in MapLibre, quindi una dipendenza in meno da mantenere |

## Versioni dell'ambiente

- **Node.js**: 24.x (in locale 24.16.0, su Vercel `nodeVersion` 24.x)
- **npm**: 11.x
- **Regione Supabase**: `eu-north-1` (dati in Europa)
- **Progetto Supabase (ref)**: `tzdigzvkneonkhkwoeed`
- **Mappa**: MapLibre GL JS 6.14.0 con lo stile `https://tiles.openfreemap.org/styles/dark`

# Requisiti, comandi e struttura del progetto

| Comando | Cosa fa |
| --- | --- |
| `npm install` | Installa le dipendenze |
| `npm run dev` | Avvia lo sviluppo locale su `http://localhost:3000` (Turbopack) |
| `npm run build` | **Build di produzione**: va eseguita a ogni fine fase, senza errori |
| `npm run start` | Avvia la build già compilata |
| `npm run lint` | Controlla il codice con ESLint |
| `npm run manuale` | Rigenera **questo PDF** dai sorgenti in `docs/manuale/` |

Per allineare le variabili d'ambiente locali a quelle di Vercel: `npx vercel env pull .env.local`.

## Struttura delle cartelle

```text
app/                     Pagine (App Router) e server action
  layout.tsx             Navbar, footer, player, barra mobile, lingua
  page.tsx               Home (Esplora): muro di locandine, lista, ricerca, filtri, mappa
  mappa/                 Mappa a tutto schermo (stessi filtri della Home)
  eventi/[...percorso]   Pagina evento SSR con dati strutturati e anteprima social
  artisti/ locali/       Directory reali con ricerca, filtri e schede [slug]
  dashboard/             Panoramica, eventi, editor, preferiti, account
  admin/                 Coda reclami, moderazione serate e coda messaggi (solo staff)
  admin/messaggi/        Messaggi dal modulo contatti, con filtri e stati
  account/               Profilo, richiesta di reclamo, impostazioni
  onboarding/role/       Scelta del ruolo ("Diventa artista o locale")
  onboarding/artist/     Profilo e reclamo artista
  onboarding/venue/      Profilo e reclamo locale
  citta/                 Indice città e pagina /citta/[city], generate dai dati reali
  per-gli-artisti/ per-le-venue/ about/ contatti/ faq/ privacy/ terms/ cookies/
  login/ register/       Accesso e registrazione
  forgot-password/       Richiesta del link di recupero
  reset-password/        Nuova password dopo il link di recovery
  auth/callback/         Ritorno da Google: crea/aggiorna la sessione
  api/suggest/           Endpoint dei suggerimenti di ricerca
  api/geocode/           Geocodifica e controllo pin/città (Photon)
  actions/locale.ts      Server action che salva la lingua scelta
  actions/contact.ts     Server action del modulo contatti (scrive in database)
  actions/messages.ts    Cambio stato di un messaggio (solo admin)
components/
  layout/                Navbar, Footer, MobileTabBar, SpotifyPlayerDock
  auth/                  Form di accesso/registrazione, RolePicker, Turnstile
  discovery/             SearchBar, QuickFilters, ViewSwitcher, useScrollAnchor
  map/                   GlobeMap, MapCanvas, EventCard, VenueEventsCard
  events/                EventTeaser, EventPageView, EventCountdown, ShareEventPanel,
                         AddToCalendar, ReportEventButton, SaveButton
  home/                  HeroPosters, EventRows, CityStrip, HomeIntro, BentoGrid, Counters
  directory/             ArtistCard, VenueCard, DirectoryFilters, VerifiedBadge
  dashboard/             DashboardShell, MyEvents, EventEditor, LocationPicker,
                         CoverField, EventPreviewCard
  claims/                ClaimPanel, PageSearch, PendingRequestPanel
  admin/                 AdminQueue, AdminEventsPanel, AdminMessagesPanel
  motion/                Reveal (IntersectionObserver)
  ui/                    Pagination, PagePlaceholder
  i18n/                  LanguageSwitcher
i18n/dictionaries/       it.ts e en.ts: tutti i testi dell'interfaccia
lib/
  auth.ts                isAdminEmail() per le decisioni di interfaccia
  auth/roles.ts          Tipo UserRole, etichette, permessi
  cities/                Query dell'indice città e percorsi pubblici
  claims/                Query e azioni del reclamo
  dashboard/             Query della dashboard e dei preferiti
  directory/             Query di artisti e locali
  messages/              Query della coda messaggi e cambio stato
  events/                filters, queries, types, format, timezone, paths,
                         calendar, saved, cover
  geo/                   città normalizzata, geocodifica, controllo del pin
  map/                   config (URL dello stile), venues (raggruppamento dei pin)
  moderation/            Coda e azioni dell'admin sulle serate
  covers/                Disegno canvas di locandine e Share Card
  seo/                   canonical, JSON-LD, card Open Graph
  pagination.ts          ITEMS_PER_PAGE: costante condivisa (vedi "errori noti")
  i18n/                  config, server, metadata, dictionaries
  supabase/              client, server, admin, env, middleware, session
supabase/migrations/     0001…0028 (vedi tabella migrazioni)
docs/                    Piani di fase, review di fase, sorgenti del manuale
scripts/manuale.mjs      Generatore del PDF (solo locale, non va in produzione)
```

`middleware.ts` (nella radice) rinnova la sessione Supabase a ogni richiesta e, alla prima
visita, sceglie la lingua in base al paese rilevato da Vercel.

# Variabili d'ambiente

Le stesse variabili esistono in **tre ambienti** su Vercel (Production, Preview, Development):
quando ne aggiungi una, impostala su tutti e tre.

| Variabile | Dove si prende | A cosa serve |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Indirizzo del progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Chiave pubblica (protetta dalla RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | Chiave di servizio: **solo server**, usata dal client admin per operazioni di manutenzione. Non va mai esposta al browser |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare → Turnstile | Chiave pubblica del captcha |
| `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile | Verifica lato server (Supabase la usa per il captcha) |
| `RESEND_API_KEY` | Resend → API Keys (`openstage-vercel`) | Invio email transazionali dall'app |
| `RESEND_SMTP_URL` | Resend → Domains → SMTP | Configurazione SMTP di Supabase Auth (host `smtp.resend.com`, porta 587, utente `resend`) |
| `EMAIL_FROM` | Scelta interna | Mittente, es. `OpenStage <noreply@getopenstage.it>` |
| `EMAIL_REPLY_TO` | Scelta interna | Risposte, es. `ciao@getopenstage.it` |
| `ADMIN_EMAIL` | Scelta interna | Email dello staff: deve combaciare con `settings.admin_email` |
| `NEXT_PUBLIC_SITE_URL` | Dominio di produzione | URL canonico per SEO e link di ritorno |
| `NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID` | URL della playlist (la parte dopo `/playlist/`) | Player Spotify in fondo alle pagine. **Oggi è vuota**: senza un id il player non compare affatto (nessun contenuto finto, nessun player vuoto) |
| `GEOCODER_TIMEOUT_MS` | Facoltativa, solo per le prove locali | Tempo massimo di attesa di Photon. In produzione il valore predefinito è 5 s; in locale si può alzare per non far fallire il controllo del pin |

> `.env.local` **non deve mai** finire su Git: il file è già escluso. Il modello da copiare è
> `.env.example`.
>
> Due variabili sono marcate **sensitive** su Vercel (`SUPABASE_SERVICE_ROLE_KEY`,
> `TURNSTILE_SECRET_KEY`): una volta salvate non sono più leggibili, per questo è normale non
> poterle "rivedere" dalla dashboard.

**Le Fasi 2, 3, 4 e 5.4 non hanno aggiunto variabili obbligatorie**: la mappa usa
OpenFreeMap e la geocodifica usa Photon, che non richiedono chiavi API né account. Vale la
regola generale: quando una fase introduce un servizio nuovo, la variabile va impostata su
**tutti e tre** gli ambienti Vercel (Production, Preview, Development) prima del test in
produzione.

# Autenticazione e gestione del ruolo

## Come funziona l'accesso

```text
Email + password:  form → Supabase Auth (CAPTCHA) → email di conferma → /auth/callback
                                        → trigger handle_new_user() crea la riga in profiles
                                        → se manca il ruolo, si passa da /onboarding/role
                                        → il ruolo viene salvato in profiles e user_metadata

Google:            bottone → Google → /auth/callback → sessione
                                        → se manca il ruolo, si passa da /onboarding/role

Reset password:    /forgot-password → Supabase (CAPTCHA) → email Resend
                                        → link → /reset-password → updateUser({ password })
```

Punti importanti:

1. **Il database è la fonte di verità del ruolo.** Il ruolo vive in `public.profiles.role`; il
   badge in navbar e le pagine protette leggono da lì (helper `getSessionProfile()`, con
   `cache()` di React: una sola lettura per richiesta, condivisa tra layout e pagina).
2. **Google non trasporta il ruolo.** Non lo si passa nell'URL di redirect perché sarebbe un
   parametro che il browser può manipolare. Perciò, al primo ingresso con Google, il ruolo si
   sceglie in una pagina dedicata e viene salvato sia nel profilo sia nei metadati
   (`user_metadata.role`), che servono come marcatore.

## Dove sono applicate le regole del ruolo

Le regole valgono su **tre livelli**, dal più importante al più visibile:

| Livello | Cosa fa | Dove |
| --- | --- | --- |
| **Database** | Rifiuta le transizioni di ruolo non ammesse e le righe incoerenti | Trigger `prevent_role_escalation` + policy RLS |
| **Pagine** | Un fan non entra nelle pagine da artista, e viene indirizzato alla scelta del ruolo | `app/onboarding/artist`, `app/events/new`, `app/onboarding/role` |
| **Interfaccia** | Mostra il ruolo e le azioni giuste (badge + link contestuale) | `components/layout/Navbar.tsx`, `lib/auth/roles.ts` |

Regola delle transizioni, in una riga: **solo `fan → artista | locale`**, una volta sola.
Tutto il resto viene annullato. L'admin può correggere (eccezione voluta, e anche le modifiche
fatte direttamente in SQL dalla dashboard non vengono bloccate).

# Database

## Tabelle

**`profiles`** — una riga per utente (creata dal trigger alla registrazione).
`id` (chiave, uguale a `auth.users.id`), `email`, `full_name`, `role` (**enum**:
`fan`/`artist`/`venue`/`admin`, predefinito `fan`), `city`, `verified_at` (verifica dello
staff), `events_daily_limit` (tetto anti-spam, vuoto = 10), `suspended_at`, `created_at`,
`updated_at`.

**`artists`** — scheda pubblica dell'artista.
`id`, `profile_id` (unico, **nullable**: un artista può esistere senza account),
`name`, `slug` (unico, per l'URL pubblico), `city`, `city_key` (generata, per i filtri),
`genre`, `spotify_url`, `bio`, `created_at`, `updated_at`.

**`venues`** — scheda pubblica del locale/organizzatore.
`id`, `profile_id` (unico, nullable), `name`, `slug`, `city`, `city_key`, `address`,
`latitude`, `longitude`, `capacity`, `website`, `created_at`, `updated_at`.

**`events`** — gli eventi.
`id`, `slug`, `title`, `description`, `artist_id`, `venue_id`, `venue_name` (locale senza
scheda), `starts_at`, `city`, `city_key`, `status` (**enum**: `draft`/`published`/`cancelled`),
`created_by`, `created_at`, `updated_at`, più i campi della scoperta: `latitude`, `longitude`,
`location_precision` (**enum**: `exact`/`approximate`), `area_radius_m`, `directions_text`
("Come arrivare"), `genre`, `kind` (**enum**:
`concert`/`dj_set`/`festival`/`open_mic`/`acoustic`/`other`), `is_free`, `price_text`,
`ticket_url`, `cover_image_url`, `is_featured`, `featured_until`, `timezone` (predefinito
`Europe/Rome`). Per la moderazione: `cancel_reason`, `merged_into`, `merged_at`,
`merged_status`, `auto_hidden_at`, `auto_hidden_status`. **`is_unclaimed` non esiste più**:
lo stato "inserito da OpenStage" si calcola dall'assenza dei `profile_id` collegati.

**`saved_events`** — gli eventi salvati da un profilo (Fase 2).
`profile_id`, `event_id`, `created_at`, con chiave primaria composta. È un segnalibro: nessun
dato sensibile, e la RLS lo limita al proprietario.

**`claims`** — richieste di reclamo di una scheda (Fase 3).
`subject_type` (`artist`/`venue`), `artist_id`/`venue_id`, `profile_id`, `status`
(`pending`/`approved`/`rejected`/`revoked`/`withdrawn`), `proof_url` obbligatorio, `note`,
date e chi ha deciso. Una sola richiesta pendente per persona e scheda.

**`reports`** — segnalazioni delle serate (Fase 4). Una per persona per evento, motivi chiusi,
nota facoltativa, stato `open`/`resolved`/`dismissed`. Non è una recensione: la legge solo
l'admin.

**`event_creations`** — registro append-only delle serate create, usato dal tetto anti-spam
(10 nelle 24 ore). Non si cancella insieme all'evento, altrimenti la quota si aggirerebbe
eliminando la bozza.

**`settings`** — parametri interni chiave/valore. Oggi contiene `admin_email` = email dello
staff. È leggibile solo dall'admin.

## Funzioni e trigger

| Oggetto | Cosa fa |
| --- | --- |
| `handle_new_user()` | Alla registrazione crea la riga in `profiles` e assegna il ruolo (o `admin` se l'email è quella dello staff) |
| `prevent_role_escalation()` | Blocca le transizioni di ruolo non ammesse (vedi sopra) |
| `touch_updated_at()` | Aggiorna `updated_at` a ogni modifica |
| `is_admin()` | Vero se l'utente loggato è l'email in `settings.admin_email`. Usata dalle policy |
| `search_events(...)` | Ricerca e filtri di Home e mappa: testo, preset temporali, genere, tipo, ingresso gratuito, distanza e paginazione in **una sola query**. `SECURITY INVOKER`, con `status = 'published'` esplicito. Dalla Fase 4 la distanza si misura dal **bordo** di una zona approssimata |
| `search_suggestions(...)` | I suggerimenti della barra di ricerca, raggruppati per tipo: città, artisti, locali, eventi, generi |
| `claim_artist(...)`, `request_venue_claim(...)`, `decide_claim(...)`, `withdraw_claim(...)` | Reclamo: artista immediato con prova, locale in approvazione, ritiro della richiesta e decisione dell'admin |
| `merge_event(...)`, `unmerge_event(...)` | Unione reversibile di due schede doppione; sposta anche i Preferiti. Solo admin |
| `city_key(...)` | Minuscolo, senza accenti e senza provincia: "Milano" e "milano (MI)" sono la stessa città |
| `event_daily_limit(...)` | Tetto anti-spam per account, predefinito 10 serate nelle 24 ore |
| `reports_apply_threshold()` | Alla terza segnalazione da persone diverse e verificate mette la serata in pausa (bozza) |
| Trigger | `on_auth_user_created` (su `auth.users`), `profiles_guard`, `artists_touch`, `venues_touch`, `events_touch`, `settings_touch`, `events_rate_limit`, `events_log_creation`, `reports_apply_threshold` |

## Indici

Chiavi primarie e unicità su `profiles.id`, `artists.profile_id`, `venues.profile_id`,
`settings.key`, più gli indici per le ricerche frequenti:

| Indice | A cosa serve |
| --- | --- |
| `events_starts_at_idx`, `events_published_starts_at_idx` | Ordinare e filtrare per data (il secondo solo sugli eventi pubblicati) |
| `events_city_idx`, `events_published_geo_idx` | Filtro per città e per posizione (latitudine/longitudine) |
| `events_artist_id_idx`, `events_venue_id_idx`, `events_created_by_idx` | I collegamenti tra tabelle |
| `events_featured_idx` | La sezione "In evidenza" |
| `events_title_trgm_idx`, `events_city_trgm_idx`, `artists_name_trgm_idx`, `venues_name_trgm_idx` | Ricerca testuale "contiene" con l'estensione `pg_trgm`: è ciò che rende veloci i suggerimenti |
| `saved_events_event_idx` | Gli eventi salvati, letti per evento |

> Gli strumenti di Supabase segnalano alcuni di questi indici come "mai usati". Con poche
> righe il pianificatore preferisce leggere tutta la tabella, quindi è un artefatto del volume
> di dati attuale, non un errore di progetto: da rimisurare con `EXPLAIN` quando gli eventi
> saranno centinaia (backlog B04).

## Migrazioni

Le migrazioni stanno in `supabase/migrations/` e vanno applicate **in ordine**, una volta sola:

| File | Contenuto |
| --- | --- |
| `0001_init.sql` | Schema iniziale: tabelle, enum, policy, trigger, impostazioni |
| `0002_role_self_service.sql` | Il ruolo `fan`/`artista`/`locale` è autodichiarabile (l'admin no) |
| `0003_hardening.sql` | Indurimento: `search_path`, revoche, indici, policy riscritte con `(select auth.uid())` |
| `0004_role_lock.sql` | Blocco delle transizioni di ruolo + coerenza del ruolo nella RLS |
| `0005_events_discovery.sql` | Campi della scoperta su `events`: coordinate, posizione approssimata, genere, tipo, ingresso gratuito, biglietti, vetrina, fuso orario |
| `0006_saved_events.sql` | Tabella `saved_events` (eventi salvati) con la sua RLS |
| `0007_artists_unclaimed.sql` | `artists.profile_id` diventa **nullable**: un artista può esistere senza account, come i locali |
| `0008_search_rpc.sql` | Funzioni `search_events` e `search_suggestions`: ricerca, filtri, distanza e paginazione nel database |
| `0009_slugs.sql` | Slug di artisti, locali ed eventi, capienza dei locali, verifica del profilo, tabella `claims` |
| `0010_search_slugs.sql` | Ricerca e suggerimenti con gli slug |
| `0011_claims.sql` | Funzioni di reclamo e pubblicazione riservata agli account verificati |
| `0012_claim_ownership.sql` | Proprietà della scheda reclamata e sostituzione della scheda vuota |
| `0013_event_unclaimed_derived.sql` | "Non reclamato" diventa un valore calcolato; la colonna salvata viene eliminata |
| `0014_claim_pending.sql` | Una richiesta in attesa alla volta, blocco della creazione, ritiro |
| `0015_event_fields.sql` | `price_text` e `venue_name` per l'editor |
| `0016_search_events_venue_price.sql` | Ricerca con locale e prezzo |
| `0017_geocode_cache.sql` | Cache della geocodifica |
| `0018_admin_publish_event.sql` | Pubblicazione per conto terzi dall'admin |
| `0019_event_covers.sql` | Bucket e policy per le locandine |
| `0020_event_anti_spam.sql` | Tetto di 10 serate nelle 24 ore e sospensione dell'account |
| `0021_profiles_field_guard.sql` | Campi del profilo protetti da modifiche non ammesse |
| `0022_event_cancellation.sql` | Annullamento delle serate con motivo |
| `0023_event_save_hygiene.sql` | Igiene del salvataggio e "Come arrivare" |
| `0024_city_quality.sql` | `city_key`, raggio onesto, città generata |
| `0025_event_merge.sql` | Unione reversibile dei doppioni |
| `0026_reports.sql` | Segnalazioni, auto-pausa e pannello di moderazione |
| `0027_merge_admin_check.sql` | `merge_event` usa `is_admin()`, una sola definizione di admin |
| `0028_contact_messages.sql` | Tabella, indici e RLS dei messaggi dal modulo contatti |

> Lo storico ufficiale è nella tabella `supabase_migrations.schema_migrations` (voci `0001`…
> `0028`). Se si aggiunge una migrazione, va aggiunta **anche** quella riga, altrimenti
> `supabase migration list` non la vede.

# Sicurezza: Row Level Security

Tutte le tabelle hanno la **RLS attiva**: senza una policy che lo consenta, una riga non è
visibile né modificabile. Regola d'oro: le policy parlano di `auth.uid()` (l'utente loggato) e
di `is_admin()`, mai di valori passati dal browser.

| Tabella | Policy | Regola in parole semplici |
| --- | --- | --- |
| `profiles` | `profiles_select_own_or_admin` | Vedi solo il tuo profilo (l'admin tutti) |
| | `profiles_update_own_or_admin` | Modifichi solo il tuo (l'admin tutti) — il ruolo passa dal trigger |
| `artists` | `artists_select_public` | Le schede artista sono pubbliche |
| | `artists_insert_own` | Crei la tua riga **solo se il tuo ruolo è `artist`** |
| | `artists_update_own`, `artists_delete_own` | Gestisci solo la tua riga (o l'admin) |
| `venues` | `venues_select_public` | Le schede locale sono pubbliche |
| | `venues_insert_own` | Crei la tua riga **solo se il tuo ruolo è `venue`** |
| | `venues_update_own`, `venues_delete_own` | Gestisci solo la tua riga (o l'admin) |
| `events` | `events_select_public` | Vedi gli eventi **pubblicati**; i tuoi li vedi anche in bozza, l'admin li vede tutti |
| | `events_insert_authenticated` | Crei un evento **solo se sei `artist` o `venue`** e come tuo |
| | `events_update_own`, `events_delete_own` | Modifichi solo i tuoi eventi (o l'admin) |
| `saved_events` | `saved_events_select_own` | Vedi solo i **tuoi** preferiti |
| | `saved_events_insert_own`, `saved_events_delete_own` | Salvi e togli solo i tuoi |
| `claims` | `claims_select_own_or_admin` | Vedi la tua richiesta (o tutte se admin); si scrive solo tramite funzioni |
| `reports` | `reports_insert_own` | Segnali solo a nome tuo, una volta per serata |
| | `reports_select_own_or_admin`, `reports_admin_update` | Vedi le tue segnalazioni; l'admin le legge e le chiude |
| `event_creations` | `event_creations_read_admin` | Il registro anti-spam è leggibile solo dall'admin |
| `settings` | `settings_select_admin`, `settings_update_admin` | Solo l'admin |
| `contact_messages` | `contact_messages_insert_public` | Chiunque può inviare un messaggio, solo con stato `new` |
| | `contact_messages_select_admin`, `..._update_admin`, `..._delete_admin` | Legge, aggiorna e cancella solo l'admin |

**Perché le policy contano davvero:** un utente malintenzionato può chiamare l'API di Supabase
direttamente, senza passare dall'interfaccia. Le regole "il fan non vede il pulsante" valgono
solo per l'interfaccia; quelle che contano sono nel database. Per esempio, un fan che prova a
creare una riga artista via API riceve un **errore 42501 (row-level security policy)**, anche
se la pagina web non gliela mostrerebbe mai.

## Avvisi di sicurezza attualmente accettati

Gli strumenti di Supabase segnalano ogni tanto dei punti da valutare. Oggi restano aperti, con
motivazione:

| Avviso | Perché è accettato |
| --- | --- |
| `is_admin()` è `SECURITY DEFINER` ed eseguibile da anonymous/authenticated | Le policy RLS la invocano: deve poter leggere `settings` (che è riservata all'admin) senza esporre nient'altro |
| *Leaked password protection* disattivata | **Non è disponibile sul piano gratuito**: è una funzione del piano Pro. Va attivata quando si passerà al piano a pagamento per i pagamenti (backlog B01) |
| Indici "mai usati" | Con poche righe il pianificatore preferisce leggere tutta la tabella: è un artefatto del volume attuale, non un difetto di progetto (backlog B04) |
| `npm audit`: segnalazioni su dipendenze di sviluppo e build | Arrivano da `eslint-config-next` e da `next` → `postcss`: servono salti di versione maggiore, da pianificare (backlog B03) |

# Come si collauda la RLS

Non serve un browser: si impersona un utente direttamente in SQL e si legge il risultato.
Con gli strumenti MCP di Supabase funziona così:

```sql
-- 1. Ci si mette nei panni di un utente loggato…
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-utente>","email":"<email>","role":"authenticated"}';

-- 2. …si prova l'operazione. Se la RLS non la consente, arriva un errore 42501.
update public.profiles set role = 'venue' where id = '<uuid-utente>';

-- 3. Si torna a leggere come admin per verificare l'effetto reale.
reset role;
select role from public.profiles where id = '<uuid-utente>';
```

Due accortezze imparate sul campo:

1. **I claim restano per tutta la transazione.** Se nella stessa sessione provi dopo una
   modifica "da dashboard", la GUC dei claim è ancora attiva e il test mente. Azzerala con
   `set local request.jwt.claims = ''` prima di simulare l'SQL diretto.
2. Per catturare l'esito di un'operazione che deve **fallire**, avvolgila in un blocco
   `do $$ … exception when others then … $$` e salva l'esito con `set_config(..., true)`, così
   l'errore non interrompe tutto il resto del collaudo.

Vale la pena farlo per: transizioni di ruolo, insert in `artists`/`venues`/`events` con ruolo
sbagliato, visibilità dei profili altrui.

# Internazionalizzazione

- Due dizionari: `i18n/dictionaries/it.ts` e `i18n/dictionaries/en.ts`.
- **`en.ts` è la fonte dei tipi**: se aggiungi una chiave solo in `it.ts`, la build fallisce.
  Aggiungere un testo significa quindi **sempre** toccare entrambi i file, con lo stesso nome.
- Lingua iniziale: l'italiano se il visitatore arriva dall'Italia (`x-vercel-ip-country`),
  altrimenti l'inglese. La scelta manuale (switcher IT/EN) viene salvata nel cookie
  `NEXT_LOCALE` e da quel momento ha la precedenza.
- Le pagine di supporto (Privacy, Termini, Cookie, Chi siamo, Contatti) sono bilingue come
  tutto il resto.

# Design system

| Elemento | Valore |
| --- | --- |
| Sfondo | `#07070D` |
| Viola (primario) | `#8B5CF6` |
| Ciano (secondario) | `#22D3EE` |
| Rosa (accento) | `#F472B6` |
| Titoli-poster (Home) | Anton |
| Titoli delle pagine | Space Grotesk |
| Etichette e metadati | IBM Plex Mono |
| Corpo del testo | Inter |
| Effetti | Glass solo su navbar, pop-up e pannelli; nella Home niente card, niente contenitori arrotondati |

Regole da non tradire:

1. **Glass solo su navbar, pop-up e pannelli**: mai dietro a testi lunghi, altrimenti la
   leggibilità crolla. La Home 5.4 non usa card: locandine, righe e bordi netti.
2. **Mobile first**: si progetta prima lo schermo piccolo.
3. **Movimento sobrio**: CSS + `IntersectionObserver`, solo `transform`/`opacity`,
   `prefers-reduced-motion` rispettato. Niente marquee infinito, niente parallax.
4. I token del tema stanno in `app/globals.css`: cambiando lì i colori, cambiano ovunque.
   I dettagli stanno in `docs/design-system.md`.

# Mappe e tile

La mappa è **MapLibre GL JS** con lo stile di **OpenFreeMap**. La scelta è stata fatta in
Fase 2 al posto di MapTiler:

| Aspetto | MapTiler | OpenFreeMap (**scelto**) |
| --- | --- | --- |
| Chiave API | Obbligatoria | **Nessuna** |
| Account | Obbligatorio | **Nessuno** |
| Uso commerciale | Solo nei piani a pagamento | **Consentito** |
| Costo | A consumo oltre la soglia gratuita | Gratuito |
| Attribuzione | Richiesta | Richiesta (già presente sulla mappa) |
| Garanzie | Contratto e SLA | **Nessuna**: è un'istanza finanziata da donazioni |

Il rischio accettato è l'ultima riga: se OpenFreeMap dovesse chiudere, la mappa resterebbe
senza tile. La mitigazione è che **l'indirizzo dello stile è in un punto solo**,
`lib/map/config.ts`: cambiare fornitore significa cambiare una riga.

Punti tecnici da ricordare:

1. **Il worker di MapLibre è servito dal nostro dominio** (`public/maplibre-gl-worker.mjs`,
   copiato da `scripts/copy-maplibre-worker.mjs` durante `prebuild`): così non dipendiamo da
   una CDN esterna e non serve allentare la Content Security Policy.
2. **`maplibre-gl` esporta solo nomi** (nessun export predefinito): si importa come
   `import { Map, Marker, Popup } from "maplibre-gl"`.
3. **Il pop-up deve restare dentro il riquadro della mappa.** Due accortezze, imparate sul
   campo: un locale con molte serate mostra **una serata alla volta** con le frecce numerate
   (altezza costante), e il margine della mappa va **dal lato giusto** (in alto per il pop-up
   desktop, che sta sopra il pin; in basso per il pannello mobile, che sta sotto). Senza queste
   due cose la scheda esce dalla mappa e viene tagliata. Nella 5.5B il margine superiore del
   popup è stato portato a **340 px** quando c'è il pannello ricerca/filtri, per non finire
   sotto l'overlay della pagina `/mappa`.
4. **Il globo è una proiezione nativa** di MapLibre: nessuna libreria aggiuntiva (Globe.gl è
   stato scartato proprio per questo).
5. **Su mobile le gesture sono "cooperative"** (`cooperativeGestures: true`): un dito scorre la
   pagina, la mappa si muove solo con due dita o nella modalità a tutto schermo.

# Ricerca, filtri e stato nell'URL

Tutto lo stato della scoperta — testo cercato, filtri, raggio e pagina — vive
**nell'indirizzo della pagina**, non in memoria. (La vecchia vista schede/tabella non è più
esposta in Home: la lista 5.4 è a righe.)

- un link filtrato è condivisibile e si apre già filtrato;
- la pagina si compone lato server, quindi funziona anche senza JavaScript;
- lista e mappa leggono **gli stessi parametri**: non possono mostrare cose diverse.

Scelte da non perdere:

| Scelta | Perché |
| --- | --- |
| Ricerca e filtri in **una funzione SQL** (`search_events`) e non nell'app | Ricerca testuale su più tabelle, paginazione corretta **con la distanza**, una sola fonte di verità |
| `status = 'published'` **esplicito** dentro la funzione | La funzione è `SECURITY INVOKER`: si comporta come l'utente che la chiama, e la regola "solo pubblicati" resta scritta a chiare lettere |
| Carattere di escape `!` nei confronti `LIKE` | In SQL non si usano i backslash: `!` evita di doverli raddoppiare. Verificato: cercare `%` restituisce 0 righe |
| Preset temporali calcolati su `Europe/Rome` con `Intl` | Corretti anche al cambio dell'ora legale, senza librerie di date. Il file è uno solo: `lib/events/timezone.ts` |
| Il **centro** del raggio va nell'URL (`lat`/`lng`) | Un raggio ha senso solo con un centro: così il filtro resta condivisibile. La posizione precisa resta dietro "Vicino a me" |
| Suggerimenti **dal nostro database**, non da un geocoder esterno | Coerenza con "niente dati finti", nessun costo, nessun servizio da configurare |
| `scroll: false` su ogni navigazione di filtro | Chi sta filtrando guarda i filtri: la pagina non deve tornare in cima |

# Deploy e rilascio

1. Il codice vive su GitHub (`openstagemusic/openstage`, ramo `main`).
2. Ogni push su `main` fa partire automaticamente un **deploy di produzione** su Vercel.
3. Progetto Vercel: `openstage` (team `ceskobeatzmusic-2476`), piano Hobby.
4. **Il preset del framework deve restare "Next.js"**: una volta è stato impostato su "Other"
   e i deploy si rompevano. Non va mai reintrodotto quell'override.
5. La protezione "Vercel Authentication" (Deployment Protection) è **disattivata**, altrimenti
   il sito pubblico chiederebbe un login Vercel.

**URL di produzione:** `https://openstage-alpha.vercel.app`

## Checklist di fine fase

1. `npm run build` senza errori.
2. Verifica delle regole nel database (SQL di collaudo qui sopra).
3. Verifica delle pagine in produzione, anche da utente non loggato (i percorsi protetti devono
   rimandare al login).
4. Commit su Git chiamato **"Fase N"** e push.
5. `docs/review-fase-N.md` aggiornato (cosa funziona, suggerimenti, debito tecnico, cose da
   riprendere).
6. Se la fase ha cambiato qualcosa di stabile (architettura, variabili, regole, schermate):
   **`npm run manuale`** per rigenerare questo PDF, con versione e data nuove in `meta.json`.

# Errori già incontrati e come si risolvono

| Sintomo | Causa | Rimedio |
| --- | --- | --- |
| Il deploy su Vercel si rompe senza un errore di codice | Preset del framework impostato su "Other" | Riportare il preset a **Next.js** e ricreare il deploy di produzione |
| In locale la build va, su Vercel no (o viceversa) | Variabile d'ambiente mancante in uno dei tre ambienti | Impostarla su Production, Preview e Development |
| Login/registrazione dall'API falliscono con errore captcha | Turnstile è attivo su Supabase: serve un token vero | Provare da browser, non con chiamate dirette. Il server deve chiamare `siteverify`; Supabase lo fa se CAPTCHA è attivo |
| `supabase migration list` non mostra le migrazioni | Manca la riga in `supabase_migrations.schema_migrations` | Inserire la voce `(version, name)` corrispondente al file |
| Un test RLS "mente" (una modifica bloccata sembra passata) | I claim JWT erano rimasti attivi da un test precedente | `set local request.jwt.claims = ''` prima del test |
| L'URL di autorizzazione OAuth arriva rotto (`client_id: invalid`) | I parametri `&` vengono corrotti aprendolo da terminale/chat | Incollare l'URL a mano nella barra degli indirizzi |
| Il selettore di lingua non cambia nulla | La scelta manuale è nel cookie `NEXT_LOCALE` | Svuotare il cookie o usare lo switcher (non l'URL) |
| L'email di conferma o di reset non arriva | SMTP o dominio Resend non configurati, oppure email in spam | Controllare Resend → Domains (verified), Supabase → Auth → SMTP, e la cartella spam |
| Il link di reset porta al login o dice "scaduto" | Il link usa ancora il flusso PKCE, che dipende dal browser della richiesta, oppure l'URL non è tra i Redirect URLs | Usare i template Supabase con `token_hash` verso `/auth/confirm`; in Supabase → Auth → URL Configuration aggiungere `https://getopenstage.it/**`, `https://getopenstage.it/reset-password`, `https://getopenstage.it/auth/callback`, `http://localhost:3000/**` |
| Google torna alla Home da scollegato | I cookie di sessione non vengono applicati alla redirect del callback | Il callback deve impostare i cookie sulla `NextResponse.redirect` (non solo su `cookies()`); verificare anche i Redirect URLs Supabase |
| La lista degli eventi in Home è **sempre vuota** | Una costante importata da un modulo `"use client"` dentro un Server Component arriva `undefined` | Tenere le costanti condivise in un file neutro: `lib/pagination.ts`. **Regola**: mai importare valori da un modulo `"use client"` in un componente server |
| `?page=2` mostra una pagina vuota | Il numero di pagina richiesto supera l'ultima disponibile | Riportare la pagina all'ultimo valore valido invece di mostrare il vuoto |
| Il pop-up di un locale con più serate esce dalla mappa e si taglia | La scheda cresce con il numero di date, e il pop-up desktop sta **sopra** il pin | Una serata alla volta con le frecce (altezza costante) + margine della mappa dal lato giusto |
| La pagina torna in cima usando ricerca e filtri | Navigazione senza `scroll: false`; i menu a tendina nativi su mobile possono saltare in cima comunque | `scroll: false` su ogni navigazione + `useScrollAnchor`, che ripristina la posizione solo se il browser ha davvero saltato |
| Un blocco SQL con `union all` si interrompe | I valori di tipo enum vanno convertiti esplicitamente nelle unioni | Scrivere `'published'::event_status` e simili |
| La build fallisce con `useSearchParams` | In Next 15 un componente client che legge i parametri va avvolto in `<Suspense>` | Avvolgere il componente (o il suo gruppo) in un confine `<Suspense>` |
| La mappa resta grigia / il worker non si carica | Il worker di MapLibre non è raggiungibile dal percorso previsto | Servirlo dal nostro dominio: `scripts/copy-maplibre-worker.mjs` lo copia in `public/` durante `prebuild` |
| Il titolo-poster appare tagliato in basso | Con `line-height` molto sotto 1 il glifo esce dalla line box e viene ritagliato | Usare `leading-none` (1) e recuperare la compattezza con un margine negativo, non con un `line-height` più piccolo |
| Un link condiviso su `/eventi/<uuid>` non apre la scheda | Dalla Fase 3 l'URL canonico è `/eventi/[città]/[slug]` | Il vecchio indirizzo fa un redirect permanente verso quello nuovo: usare sempre il link canonico |

# Come si verifica una pagina (browser headless)

Le fasi si collaudano in un **browser vero**, non solo con la build: si usa il Chrome installato
sul computer, guidato da `puppeteer-core` (nessun browser da scaricare). Lo script temporaneo si
crea, si usa e **si cancella**: non resta nel repository.

La ricetta messa a punto nella Fase 2:

1. `puppeteer.launch({ executablePath: "...chrome.exe", headless: true })`.
2. `page.setViewport()` con **almeno due misure**: desktop 1280×900 e mobile 390×844
   (`isMobile`, `hasTouch`), più 320 px per scoprire l'overflow più stretto.
3. `page.goto(..., { waitUntil: "networkidle2" })` e una pausa: la mappa ha bisogno di qualche
   secondo prima di essere affidabile.
4. Per cliccare **senza falsare il test**: leggere `getBoundingClientRect()` dell'elemento e
   usare `page.mouse.click(x, y)` / `page.touchscreen.tap(x, y)`. `elementHandle.click()` fa
   scorrere l'elemento in vista e nasconde proprio i difetti di scroll che si vogliono trovare.
5. Misurare i **numeri**, non le impressioni: `window.scrollY` prima e dopo, il rettangolo del
   pop-up confrontato con quello della mappa, il conteggio dei risultati.
6. Ascoltare `console` (errori) e `pageerror`: una fase non è chiusa se la console non è pulita.
7. Provare **in locale e in produzione**, e in **entrambe le lingue**. In locale mancano gli
   header geografici di Vercel: la lingua parte in inglese e il centro mappa è Roma. È utile per
   accorgersi di differenze tra i due ambienti.

> I pin della mappa sono disegnati su WebGL e **non esistono come elementi HTML**: per cliccarli
> si recupera l'istanza di MapLibre dai dati interni di React e si usa `map.project([lng, lat])`
> per sapere dove si trova sullo schermo.

# Il manuale PDF

Questo documento **si genera**, non si scrive a mano:

- i contenuti sono file Markdown in `docs/manuale/` (uno per capitolo/macro-area);
- `docs/manuale/meta.json` contiene titolo, versione, data e quali fasi copre;
- `npm run manuale` costruisce il PDF con il Chrome installato sul computer (nessun servizio
  esterno, nessun browser da scaricare) e lo salva come `docs/manuale/OpenStage-Manuale.pdf`;
- l'indice si costruisce **da solo** dai titoli dei file `.md`.

Per aggiornarlo: si modificano i `.md`, si aggiornano versione e data in `meta.json`, si
rilancia `npm run manuale` e si committa il PDF. Il generatore è `scripts/manuale.mjs` e
**non** entra né nella build di Next.js né nel deploy: serve solo in locale.

# Roadmap delle fasi

| Fase | Contenuto previsto |
| --- | --- |
| 1 · 1.2 · 1.3 | ✅ Fondamenta, indurimento del database, ruoli definitivi |
| 2 | ✅ Scoperta: mappa, pagine evento, ricerca, filtri, salvataggio, vetrina |
| 3 | ✅ Directory artisti/locali, reclamo, dashboard, editor eventi, condivisione, preferiti |
| 4 | ✅ Qualità dei dati, serate collegate, segnalazioni e moderazione, serate passate |
| 5.4 | ✅ Remake grafico della Home: muro di locandine, lista a righe, mappa a tutta pagina, guscio |
| 5.5A · 5.5B | ✅ Restyling login/registrazione/account/onboarding e scheda evento + popup/bottom sheet mappa |
| 6 | ✅ Pagine pubbliche ed editoriali, `/citta` e schede città, modulo contatti reale e coda messaggi admin; sezione Città in Home e Dashboard evidenziata |
| 7A | ✅ Email transazionali (Resend), conferma email, reset password, Turnstile lato Supabase. Resta `B48` (risposta ai contatti) |
| 7B | Area fan, notifiche in-app, coda email, webhook, digest. **Prossima dopo la 5.5** |
| 8 | Pannello admin completo, 2FA e claim a invito |
| 9 | Community: "segui" e inviti virali |
| 10 | Spotify e area artista |
| 11 | Monetizzazione opzionale (PayPal): richiede Vercel Pro e partita fiscale |
| 12 | Serie, locali chiusi, bacheca ingaggi |
| 13 | SEO, legal, audit, polish finale e remake parte 2 |

> L'ordine dalla 6 in poi è indicativo e viene dettagliato una fase per volta, con un piano
> scritto prima di scrivere codice. La roadmap approvata è in `docs/roadmap.md`; se questo
> manuale dice altro, vale la roadmap.
