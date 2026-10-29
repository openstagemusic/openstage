# Fase 10 — Spotify e Area Artista/Locale

> **Stato: 10A, 10B e 10D fatte.** La playlist reale **OpenStage — Selezione** è attiva dal
> 29 ottobre 2026: sezione in Home, `/playlists`, footer e sitemap. Se la tabella resta vuota,
> la pagina torna `noindex` e il dock si spegne.

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

### 10B — Link e social della scheda (fatto)

- Campi nuovi su artisti e locali: sito, Instagram, Facebook, TikTok, YouTube, SoundCloud,
  Bandcamp, Linktree. Spotify resta il campo già esistente degli artisti.
- **Icone, non pulsanti**: sulla scheda pubblica i link compaiono come SVG inline (nessuna
  libreria, nessuna richiesta esterna), solo se il campo è compilato. Tocchi da 44px, nome
  accessibile.
- Normalizzazione in `lib/social/links.ts`: accetta link completi o `@nomeutente` per
  Instagram, TikTok e SoundCloud; verifica il dominio della piattaforma; forza https.
  Il database rifiuta URL non https o troppo lunghi.
- Form in **Account → Link e social**, con errore sul singolo campo.
- I link entrano anche nel dato strutturato `sameAs` della scheda.

### 10D — Playlist in Home (fatto)

- Sezione **06 / Playlist** in fondo alla Home, dopo il bento: copertina, testo editoriale e
  pulsanti **Ascoltala su Spotify** / **Salva su Spotify**. Nessun secondo player nella pagina.
- Compare **solo** con almeno una playlist pubblicata: nessun riquadro vuoto.
- Il player unico è il **dock fisso in basso**, presente in tutte le pagine pubbliche (Home
  compresa). Vive nel layout: cambiando pagina l'iframe non viene smontato, quindi la musica
  continua.
- Il dock si può **ridurre a icona** con il tastino a destra: l'iframe resta montato (l'audio
  continua) e la scelta è ricordata nel browser. Su mobile il tastino sta sopra la barra.

### 10E — Proposte per la playlist (fatto)

- **Verifica reale dei link Spotify** con l'oEmbed ufficiale: un link inesistente
  (404) blocca il salvataggio. Vale per il link della scheda e per la traccia proposta.
- Campo **Traccia per la playlist** nel profilo artista: solo un **brano** Spotify, non album,
  artista o playlist. Il database accetta solo `open.spotify.com/track/…`.
- La proposta arriva in **/admin/playlist**: apri il brano, copia il link, aggiungilo su Spotify
  e segna l'esito (**da valutare / aggiunta / scartata**). L'artista vede lo stato nel profilo.
- **Nessun OAuth e nessuna scrittura automatica**: l'aggiunta alla playlist resta manuale.
- Un trigger impedisce all'artista di dichiarare da solo la traccia **aggiunta** o **scartata**:
  l'esito lo registra solo l'admin.
- Un link nuovo o modificato viene verificato; se non cambia, il salvataggio resta veloce.

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
4. ✅ **10B** — moduli ruolo nel guscio dashboard e link social con icone.
5. **10C** — solo se il proprietario lo chiede.

### Fatto appena arrivata la playlist

- ✅ Riga reale in `spotify_playlists` con `published = true` (`OpenStage — Selezione`).
- ✅ `/playlists` nel footer e in `sitemap.xml` (B83).
- ✅ Sezione in Home, dock spento lì e attivo sulle altre pagine; nessuna sovrapposizione con la barra mobile.

## QA

- [x] Link Spotify validi e invalidi: messaggio corretto, nessun embed rotto.
- [x] La scheda artista mostra il player solo con un link valido.
- [x] Il dock non copre la barra mobile né il contenuto; si spegne senza playlist.
- [x] `/playlists` mostra solo playlist reali e pubblicate, in IT e EN (oggi: stato vuoto,
      `noindex`, fuori da menu e footer finché non c'è una playlist).
- [x] Il proprietario vede i follower della propria scheda, gli altri no.
- [x] Le icone compaiono solo per i link reali, con il dominio giusto; un link sbagliato
      viene rifiutato e non salva nulla.
- [x] Completezza scheda, prossime serate, follower e azioni rapide in `/dashboard`.
- [x] La sezione playlist in Home compare solo con una playlist reale, con embed e CTA;
      senza playlist non lascia spazio vuoto e il dock resta spento.
- [x] Un link Spotify inesistente viene rifiutato; la traccia proposta deve essere un brano
      (album, artista e playlist vengono rifiutati) e finisce nella coda admin.
- [ ] Build, test reale, deploy e commit "Fase 10A" / "Fase 10B".
