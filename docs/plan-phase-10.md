# Fase 10 — Spotify e Area Artista/Locale

> **Stato: 10A fatta il 28 ottobre 2026.** Restano i link reali delle playlist (nessuno
> inventato) e la **10B**. Regola: se manca una playlist vera, `/playlists` mostra uno stato
> vuoto e il dock resta spento.

## Obiettivo

Dare ad artisti e locali strumenti reali per mostrare la propria musica e gestire la scheda,
e al pubblico un ascolto continuo mentre esplora. Nessun servizio a pagamento, nessuna API
con chiavi: solo embed pubblici di Spotify.

## Cosa entra

### 10A — Spotify

- **Normalizzazione dei link**: accetta `open.spotify.com/artist|album|track|playlist/ID`
  (anche con prefisso `/intl-xx/` e parametri) e `spotify:artist:ID`. Qualsiasi altro link
  viene rifiutato con un messaggio chiaro. Nessuna chiamata alla Web API.
- **Profilo artista**: il campo `artists.spotify_url` esiste già. Si aggiungono validazione
  al salvataggio e anteprima del player nell'editor.
- **Scheda artista**: player incorporato compatto quando il link è valido, accanto alle
  informazioni già presenti. Il conteggio follower e il pulsante Segui restano dove sono.
- **Dock persistente**: `components/layout/SpotifyPlayerDock.tsx` esiste già e il CSS lo
  posiziona sopra la barra mobile. Si attiva solo con una playlist reale.
- **`/playlists`**: elenco delle playlist OpenStage reali, con embed e descrizione, in IT/EN.
- **Dati**: nuova tabella `spotify_playlists` (`id`, `slug`, `title`, `description`, `url`,
  `published`, `sort_order`, `created_at`). RLS: lettura pubblica delle sole pubblicate,
  scrittura solo admin. Le righe si caricano con una migration SQL usando i link reali.
  Così cambiare playlist non richiede un redeploy.
- Testi IT/EN nei dizionari.

### 10B — Area artista/locale

Moduli dentro il guscio `/dashboard` già esistente, senza duplicare dashboard:

- **Completezza scheda** calcolata sui campi reali (bio, città, copertina, sito,
  Spotify, ecc.), con l'elenco di cosa manca e il link per completare.
- **Prossime serate** della scheda (query esistenti).
- **Follower totali** della propria scheda, letti dalla funzione `follow_count`: visibili
  solo al proprietario, nessuna classifica.
- **Azioni rapide**: crea evento, modifica profilo, copia link pubblico della scheda.
- Per i locali gli stessi moduli, con i campi che ha davvero un locale (niente Spotify se
  non esiste la colonna: si valuta a parte).

### 10C — (dopo, facoltativo)

Gestione delle playlist da `/admin`: creare, modificare, pubblicare e ordinare senza SQL.

## Cosa non entra

- **Spotify Web API, OAuth e import automatico** di brani o ascolti: richiede Client ID,
  quote e manutenzione. L'embed è sufficiente e non espone dati personali.
- **Statistiche Pro**, galleria, badge, widget: Fase 11.
- **Filtri, duplica e azioni multiple sugli eventi** (B58): se non servono alla 10B,
  restano dove sono.
- **Calendario `.ics` dei Preferiti** (S2): valutare in 10B o rimandare alla 13.
- Nessun conteggio di ascolti o "brano più ascoltato": sarebbe una metrica di vanità.

## Servizi esterni e ambiente

- **Nessun servizio da creare.** Spotify embed è pubblico, gratuito e senza chiavi.
- **Serve dal proprietario**: i **link reali** delle playlist OpenStage (almeno una) e i
  link Spotify degli artisti che li hanno.
- **Variabili**: `NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID` è già prevista in `.env.local` ed è
  **vuota**. Con la tabella `spotify_playlists` non serve più; se si preferisce l'env,
  va impostata anche su Vercel. Consigliata la tabella.
- **Git**: `Francesco` / `ceskobeatzmusic@gmail.com`.
- **SQL**: una migration nuova per `spotify_playlists` e il seed reale.

## Ordine di lavoro

1. ✅ **10A.1** — parser e validazione link (`lib/spotify/links.ts`), controlli anche nel database.
2. ✅ **10A.2** — migration `0055_spotify_playlists.sql` e pagina `/playlists`.
3. ✅ **10A.3** — player sulla scheda artista e dock collegato alla prima playlist pubblicata.
4. ▶ **10B** — moduli ruolo nel guscio dashboard.
5. **10C** — solo se il proprietario lo chiede.

### Da fare appena arrivano le playlist

- Inserire le righe reali in `spotify_playlists` con `published = true`.
- Aggiungere `/playlists` a menu/footer e `sitemap.xml` (B83).
- Controllare che il dock compaia e non copra la barra mobile.

## QA

- [x] Link Spotify validi e invalidi: messaggio corretto, nessun embed rotto.
- [x] La scheda artista mostra il player solo con un link valido.
- [x] Il dock non copre la barra mobile né il contenuto; si spegne senza playlist.
- [x] `/playlists` mostra solo playlist reali e pubblicate, in IT e EN (oggi: stato vuoto,
      `noindex`, fuori da menu e footer finché non c'è una playlist).
- [ ] Il proprietario vede i follower della propria scheda, gli altri no.
- [ ] Build, test reale, deploy e commit "Fase 10A" / "Fase 10B".
