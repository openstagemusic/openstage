# Backlog OpenStage

Qui finiscono le cose che **non** entrano nella fase in corso: micro-migliorie da fare "mamma
mano" quando capita l'occasione, e operazioni grosse da riprendere e valutare insieme alla
fine delle nove fasi.

Legenda tipo: **🟡 micro** = piccola, si può fare in qualsiasi momento · **🟢 in fase** = va
fatta dentro la fase indicata · **🔴 grossa** = da riprendere insieme a fine progetto.

| # | Voce | Tipo | Origine | Note |
| --- | --- | --- | --- | --- |
| B01 | Attivare *Leaked password protection* su Supabase | 🔴 | Fase 1.2 | **Non disponibile sul piano free**: funzione Pro. Si attiva quando si passerà al piano a pagamento per i pagamenti |
| B02 | Revocare i token di servizio usati in configurazione (Vercel, Supabase) | ✅ | Fase 1.2 | **Fatto**: i due token (`vcp_…` e il PAT Supabase) sono stati revocati dall'utente |
| B03 | `npm audit`: 7 segnalazioni su dipendenze di sviluppo e build | 🔴 | Fase 1.3 | Da `eslint-config-next` (braces/micromatch) e da `next` → `postcss`: serve un salto di versione maggiore, da pianificare |
| B04 | Indici su `events` e trigram segnalati come "mai usati" | 🟡 | Fase 1.2 | Verificato a fine Fase 2: con 3 righe il pianificatore fa sempre una scansione completa, quindi gli indici non vengono toccati. Non è un difetto di progetto — da rimisurare con `EXPLAIN` quando gli eventi saranno centinaia |
| B05 | Test automatici end-to-end sui flussi critici | 🔴 | Fase 1.3 | Primo caso: "registrazione come fan → diventa artista → bloccato"; poi accesso e creazione evento |
| B06 | Colonna `role_chosen_at` su `profiles` | 🔴 | Fase 1.3 | Registra *quando* è stato scelto il ruolo: utile per l'assistenza e per metriche vere, non di vanità |
| B07 | Cancellazione dell'account da parte dell'utente | 🔴 | Fase 1.3 | Diritto alla cancellazione (privacy): serve una procedura chiara con i dati collegati (artista, locale, eventi) |
| B08 | Email transazionali (Resend) e attivazione della conferma email | 🟢 | Fase 1 | Servizio già previsto nello stack: si attiva quando il volume di utenti lo richiede |
| B09 | Immagine di anteprima social (Open Graph) e favicon del brand | 🟡 | Fase 1 | Oggi le anteprime usano i valori di base: una grafica dedicata migliora molto la condivisione |
| B10 | Pagina "Account" per gestire i propri dati | 🔴 | Fase 1 | La chiave di traduzione `nav.account` esiste già ma la pagina non è stata costruita |
| B11 | Protezione clash: `TURNSTILE_SECRET_KEY` presente ma non usata dall'app | 🟡 | Fase 1 | Oggi la verifica la fa Supabase: decidere se serve anche lato applicazione |
| B12 | Animazioni Framer Motion (parallax, tilt, scroll-reveal) | 🟢 | Fase 1 | Previste dal design system: da introdurre con criterio, senza pesare su mobile e accessibilità |
| B13 | Verifica accessibilità (contrasto, focus, navigazione da tastiera) | 🔴 | Fase 1.3 | Il vetro e i testi su sfondo scuro vanno misurati, non stimati |
| B14 | Dominio definitivo e nome del progetto | 🔴 | Fase 1 | `openstage.vercel.app` è un altro progetto: valutare un dominio proprio (es. `openstage.app`) |
| B15 | Mappa degli eventi (MapLibre) | ✅ fatta | Fase 2 | Realizzata in Fase 2.1 con **OpenFreeMap** invece di MapTiler: nessuna chiave API, nessun account, uso commerciale consentito. Resta il rischio "fornitore gratuito senza SLA" (vedi review 2.1) |
| B16 | Pagamenti opzionali (PayPal) e passaggio a Vercel Pro | 🔴 | Fase 8 | Il piano Hobby non è commerciale: da pianificare bene prima di incassare |
| B17 | Manuale: valutare immagini e impaginazione se il PDF cresce | 🟡 | Fase 1.3 | Oggi è testo e tabelle: sotto controllo |
| B18 | Più eventi nello stesso locale si sovrappongono in un unico pin | ✅ fatta | Fase 2 | Risolto in Fase 2.1 con il raggruppamento per locale: un pin con il numero delle serate e la scheda che elenca le date (`lib/map/venues.ts`, `components/map/VenueEventsCard.tsx`) |
| B19 | Pagina dei preferiti per gli eventi salvati | 🔴 | Fase 2.2 | "Salva" funziona e scrive nel database, ma non c'è ancora un posto dove rivedere gli eventi salvati: serve una sezione (profilo o pagina dedicata) |
| B20 | Preset temporali ancorati al fuso `Europe/Rome` | 🟡 | Fase 2.2 | "Stasera / questo weekend…" sono calcolati sulla serata italiana. Se servirà il fuso del visitatore, il punto di modifica è uno solo (`lib/events/timezone.ts`) |
| B21 | Ricerca: indici trigram non ancora sfruttati da `search_events` | 🟡 | Fase 2.2 | Con pochi eventi è irrilevante; da rivedere quando saranno migliaia (i suggerimenti li usano già) |
