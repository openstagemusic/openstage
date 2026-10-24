# OpenStage — Design System (Fase 5)

> Documento di riferimento per la grafica e il movimento. Se un componente dice
> qualcosa di diverso, vince questo file (e, sopra a tutto, `AGENTS.md`).
> Approvato il 21 ottobre 2026.

## 1. Principio guida

OpenStage non è un gestionale e non è una biglietteria. È **il muro delle
locandine del locale**: nero, tipografia forte, poster grandi, pochi bordi e
pochissimi effetti. Il carattere lo danno il contenuto e l'impaginazione, non i
neon.

Riferimenti come *principi*, mai come copia: l'impaginazione editoriale di
Resident Advisor, l'assenza di attrito di DICE, il contrasto delle locandine
della club culture.

## 2. Colori

I token vivono in `app/globals.css` dentro `@theme` (Tailwind v4, CSS-first).
Non si usano colori Tailwind generici (`zinc`, `slate`, `blue`) nei componenti:
si usano i token semantici qui sotto.

| Token | Valore | Uso |
| --- | --- | --- |
| `bg` | `#07070D` | fondo pagina |
| `surface` | `#0D0D1A` | pannelli, campi, card piene |
| `surface-2` | `#12121F` | secondo livello, hover di pannelli |
| `foreground` | `#E8E8F2` | testo principale |
| `muted` | `#9AA0B8` | testo secondario |
| `line` | `rgba(255,255,255,0.10)` | bordi sottili |
| `line-strong` | `rgba(255,255,255,0.18)` | bordi attivi |
| `violet` | `#8B5CF6` | marchio, azione primaria |
| `cyan` | `#22D3EE` | live, attivo, informazione |
| `pink` | `#F472B6` | attenzione, annullamento, segnalazione |

Regole:

- **Tre accenti, tre ruoli.** Niente quarto colore (niente verde acido).
- Il gradiente viola→ciano resta solo sul marchio e su un filo decorativo.
  I bottoni primari sono **viola pieno**, non gradiente.
- I gradienti non stanno mai dietro a testi lunghi.
- Il colore non è l'unico segnale di stato: sempre anche testo o icona.

## 3. Tipografia

- Titoli e numeri: **Space Grotesk** (`font-display`).
- Corpo e interfaccia: **Inter** (`font-sans`).
- Titoli-poster della Home e date: **Anton** (`font-poster`), solo maiuscolo,
  con tracking stretto. Non si usa per paragrafi.
- Etichette, metadati e numeri di sezione: **IBM Plex Mono** (`font-mono`).
- Caricati con `next/font`, `display: swap`. Anton e IBM Plex Mono entrano nella
  Fase 5.4 per la Home poster wall; non sostituiscono Space Grotesk/Inter.

| Ruolo | Mobile | Desktop | Note |
| --- | --- | --- | --- |
| H1 | 36–40 px | 56–64 px | tracking `-0.03em`, line-height 1.05 |
| H2 | 24 px | 30 px | tracking `-0.02em` |
| H3 | 18–20 px | 20–22 px | peso 600 |
| Body | 16 px | 16 px | line-height 1.6 |
| Small | 14 px | 14 px | line-height 1.5 |
| Micro / label | 12 px | 12 px | maiuscoletto, tracking largo |

L'italiano è più lungo dell'inglese: nessun pulsante a larghezza fissa, nessun
titolo con `whitespace-nowrap` se non è un numero.

## 4. Spazi, raggi, bordi

- Base 4 px. Scala usata: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- Sezione: `64px` mobile, `96px` desktop.
- Contenitore: `max-w-7xl` per la scoperta, `max-w-5xl` per la lettura, gutter
  `16px` mobile / `24px` desktop.
- Raggio card: `24px` (`rounded-card`); controlli: pill (`rounded-full`);
  elementi interni: `16px`.
- Bordi: 1 px traslucido (`border-line`). Mai bordi spessi o neri.
- Ombre: solo per staccare un elemento dal fondo (`shadow-lift`) o per l'alone
  di hover (`shadow-glow`). Niente ombre colorate ovunque.

## 5. Glass

Solo navbar, card e pop-up. Mai dietro a paragrafi lunghi.

```css
background: rgba(255, 255, 255, 0.04);
backdrop-filter: blur(16px) saturate(140%);
border: 1px solid rgba(255, 255, 255, 0.10);
```

## 6. Movimento

Niente libreria di animazione nel bundle iniziale: dopo la prova, Framer Motion
costava ~45 KB gzip per un solo fade. Le animazioni della Fase 5 sono **CSS +
IntersectionObserver**, con le stesse regole. Framer Motion entra in Fase 13
solo per le interazioni che lo giustificano, con un budget massimo di 20 KB.

| Tipo | Durata | Distanza | Easing |
| --- | --- | --- | --- |
| Micro (hover, focus) | 150 ms | 0–2 px | `ease-out-expo` |
| UI (menu, pop-up) | 250 ms | 8 px | `ease-out-expo` |
| Reveal (sezioni) | 400–500 ms | 12–16 px | `ease-out-expo` |
| Hero | 500–600 ms | 16 px | `ease-out-expo` |

Regole:

- Solo `transform` e `opacity`. Mai animare `width`, `height`, `top`, `left`.
- Stagger 40–60 ms, massimo 6 elementi.
- `prefers-reduced-motion` rispettato **globalmente**: niente parallax, niente
  reveal, niente contatori animati.
- Niente animazioni su testi lunghi, niente loop infiniti, niente autoplay.
  Unica eccezione: il puntino “live” di stato, che pulsa piano e si spegne con
  reduced motion.
- **Home poster wall (5.4)**: il titolo entra con un rise di 16 px, le locandine
  con uno stagger di 80 ms (max 4), le sezioni con `Reveal`, le righe evento con
  uno sweep viola in hover/focus. Il ticker è statico e entra una volta: nessun
  marquee infinito.
- Niente page transition globali: il contenuto deve essere leggibile subito.
- Il contenuto critico non parte da `opacity: 0` in SSR. Le sezioni sotto la
  piega usano `data-reveal`, con fallback `@media (scripting: none)`.
- Tilt 3D solo su puntatore fine (`@media (pointer: fine)`), massimo 5°,
  disattivato su touch e con reduced motion.

## 7. Mobile

OpenStage si usa per strada, con una mano:

- target minimo **44×44 px**;
- azioni principali nella metà bassa dello schermo;
- barra fissa in basso sulle pagine di scoperta, nascosta in dashboard/admin/auth/form
  lunghi. È **ruolo-specifica**:
  - non loggato: `Esplora · Mappa · Artisti · Locali · Accedi`;
  - loggato: `Esplora · Notifiche · Artisti · Locali · Profilo`;
  - admin: nessuna barra pubblica, c'è il guscio admin;
  - la mappa resta raggiungibile da Esplora e da `/mappa`, non sparisce dal prodotto;
- player Spotify sopra la barra, mai sopra il contenuto;
- `env(safe-area-inset-bottom)` rispettato;
- niente informazioni disponibili solo su hover.

## 8. Accessibilità

- Contrasto AA: 4,5:1 per il corpo, 3:1 per i testi grandi e i bordi attivi.
- Focus visibile sempre: anello ciano 2 px con offset 2 px.
- Skip link “Vai al contenuto” come primo elemento.
- Heading semantici, un solo H1 per pagina.
- Form: label esplicite, errori testuali, `aria-invalid` dove serve.
- Icone decorative `aria-hidden`; icone sole con `aria-label`.

## 9. Performance

Budget misurati su mobile 4G:

- LCP < 2,5 s, CLS < 0,1, INP < 200 ms;
- JS aggiunto dal movimento ≤ 20 KB gzip;
- nessun video hero, nessun WebGL decorativo, nessuna mappa nel primo paint;
- mappa inizializzata quando entra nello schermo, con skeleton della stessa
  altezza;
- locandine: una sola immagine per card (niente doppia copia sfocata), `lazy`
  sotto la piega, `fetchpriority="high"` solo sulla prima;
- font con `display: swap`, immagini con dimensioni esplicite.

## 10. Stati dei componenti

Ogni componente interattivo deve avere: default, hover, active, focus-visible,
disabled, loading (se asincrono), empty (se mostra dati) ed error (se può
fallire). Non si consegna un componente con il solo stato default.

## 11. Cosa non facciamo

Sfondi bianchi o chiari, card blu da dashboard, tabelle da gestionale,
gradienti ovunque, blob 3D, foto stock, testimonial finti, contatori finti,
confetti, cursori personalizzati, autoplay, light mode, hover-only su mobile.
Niente notifiche di vanità (“nuovo follower”, “visualizzazioni”, “complimenti”):
non sono eventi azionabili e sporcano il centro notifiche.

## 12. Applicazione alle pagine interne (Fase 5.5)

La Home 5.4 è il **riferimento**, non un template da copiare. Le pagine interne
devono sembrare lo stesso prodotto, ma restare più leggibili e più sobrie.

### Regole comuni

- Meno card glass generiche, più gerarchia editoriale: titolo-poster, etichette
  mono, righe e separatori.
- Il glass resta su navbar, card e pop-up. Non va dietro a testi lunghi.
- I controlli principali sono quadrati o pill a seconda del contesto, ma non
  cambiano forma da una pagina all'altra.
- I dati reali comandano il layout: nessuna immagine di repertorio, nessun
  numero inventato, nessuna dashboard riempita con placeholder.
- SSR e contenuto indicizzabile restano intatti: il restyling non nasconde il
  testo dietro JavaScript.
- Un blocco alla volta, con build e QA. Niente "grande restyling" unico.

### 5.5A — Login, registrazione, account e onboarding

- **Login e registrazione**: pagina a due tempi, non una card sola al centro.
  - Mobile: etichetta mono, titolo-poster compatto, testo breve, poi il form.
  - Desktop: colonna editoriale a sinistra (titolo-poster, valori reali del
    prodotto) e pannello form a destra, largo al massimo `max-w-md`.
  - Il pannello form è una card sobria: bordo `line`, fondo `surface`, niente
    glass dietro a testi lunghi.
  - Un solo H1. Il titolo può usare Anton, il corpo resta Inter.
  - I valori sotto il titolo sono solo quelli veri: gratis per sempre, niente
    pay-to-play, eventi e luoghi reali. Nessun numero inventato.
- **Campi**: label mono maiuscole, input alti almeno 44 px, bordo sottile,
  focus ciano visibile, errore testuale sotto il campo o sopra il pulsante.
  Niente placeholder al posto della label.
- **Azioni**: pulsante primario pieno viola, forma squadrata o pill coerente con
  il resto del sito; Google è un'azione secondaria, non un secondo mondo.
- **Account**: testata editoriale con etichetta mono, titolo-poster, email e
  ruolo; sezioni separate da `border-line`, non una pila di card glass. La
  scheda artista/locale resta il blocco principale, con stato di verifica e
  link pubblico. Le azioni admin/fan sono righe o pannelli sobri, non card
  promozionali.
- **Onboarding**: stesso guscio editoriale. La scelta del ruolo è una lista di
  tre opzioni grandi, con numero mono, titolo e descrizione; quella selezionata
  usa bordo viola e fondo viola tenue. Le pagine artista/locale mettono prima la
  ricerca della scheda e poi la creazione, con la stessa gerarchia.
- **Niente nuove funzioni**: la 5.5A è solo pelle e gerarchia. Conferma email,
  reset password e password per Google restano nella 7A.
- **Build e QA**: 320, 390 e 1280 px; italiano e inglese; form reali; nessun
  dato finto.

### 5.5B — Scheda evento e popup mappa

- **Stato: applicata il 24 ottobre 2026** (evento, popup desktop e bottom sheet mobile).
- Scheda evento: copertina-first quando esiste; titolo grande, metadati in
  righe, azioni principali in basso su mobile. Il dettaglio non è una griglia di
  card tutte uguali.
- Popup mappa: compatto, una serata alla volta, gerarchia chiara e target
  ≥ 44 px. Il glass è ammesso perché è un pop-up, ma niente card dentro card.
- Bottom sheet mobile: stessa informazione del popup, senza duplicare la
  pagina evento.

### 5.5C — Directory artisti e locali

- **Stato: applicata il 24 ottobre 2026** (`/artisti`, `/locali` e schede).

- Card con copertina reale quando esiste; altrimenti monogramma tipografico o
  poster tipografico, mai foto stock.
- Nome, città e genere/indirizzo devono leggersi subito; il badge di verifica
  non ruba la scena.
- Schede artista/locale: testata forte, dati reali, eventi in arrivo e passati
  con lo stesso linguaggio delle righe della Home.
- Filtri e paginazione restano funzionali e visibili; il restyling non li
  nasconde.

### 5.5D — Guscio dashboard, panoramica e pagine esistenti

- **Stato: applicata il 24 ottobre 2026** (guscio, panoramica, I miei eventi, Preferiti).

- Un solo guscio per artista, locale e fan; i moduli cambiano, la struttura no.
- Menu laterale desktop e pannello mobile già esistenti: si ripuliscono, non si
  reinventano. Niente glass generico: bordo `line`, fondo `surface`, etichette
  mono e voce attiva riconoscibile.
- **Voce attiva**: vince la rotta più specifica. Su `/dashboard/events/new` non
  devono risultare attive insieme “I miei eventi” e “Crea evento”; su
  `/dashboard/events/[id]` resta attiva “I miei eventi”.
- **Panoramica**: numeri reali già disponibili (bozze, pubblicati, annullati,
  preferiti), KPI cliccabili e scorciatoie. Niente gradienti decorativi, niente
  statistiche finte.
- **I miei eventi**: sezioni “In programma”, “Bozze”, “Annullate”, “Passate” con
  la stessa gerarchia delle righe pubbliche; stato sempre testo + colore; azioni
  esistenti (modifica, pubblica, annulla, elimina, vedi pagina) leggibili e non
  tutte uguali. L'eliminazione resta l'ultima strada e usa la conferma attuale.
- **Preferiti**: griglia di card evento coerente con la 5.5B/5.5C, stato vuoto
  editoriale e, se l'azione esiste già, rimozione rapida. I filtri e il calendario
  `.ics` restano nella Fase 10/7B.
- **Profilo**: `/account` è già rifatto nella 5.5A e resta la pagina canonica.
  Dal guscio deve essere chiaro come tornarci e come tornare alla dashboard: o
  la voce apre una pagina dentro il guscio, o `/account` mostra un ritorno
  esplicito. Non si duplica la pagina.
- I moduli funzionali ruolo-specifici e le funzioni nuove arrivano nella
  **Fase 10**, non nella 5.5D.

### 5.5E — Editor eventi (crea/modifica)

- **Stato: applicata il 24 ottobre 2026** (crea e modifica evento).

- Stesso linguaggio della 5.5D: sezioni numerate, etichette mono, bordi `line`,
  focus ciano, niente card dentro card.
- Il form resta **unico e reale**: titolo, tipo, genere, data/ora/fuso, luogo,
  mappa, artista, prezzo, biglietti, copertina, descrizione e doppioni.
- Desktop: form a sinistra, anteprima sticky a destra. Mobile: anteprima dopo il
  form o in un pannello richiudibile, senza duplicare i campi.
- Barra azioni chiara: salva bozza, pubblica, torna agli eventi. Su mobile resta
  raggiungibile senza attraversare tutto il form.
- Riepilogo errori in alto, errore vicino al campo, messaggi di successo con
  `role="status"`.
- Avviso “modifiche non salvate” prima di uscire, se il form è sporco.
- Niente nuovi campi, niente migration: `ends_at`, serie e festival restano
  **B41/Fase 12**; lineup, età e accessibilità richiedono una decisione di
  schema e non entrano qui.
- Il doppione resta un avviso, non un blocco: la scelta “crea comunque” è già
  nel codice.

### Confine con il resto

- **7A**: logica email e auth, non restyling. Se la 5.5A non è pronta, la 7A
  tocca solo copy e flussi. La sezione sicurezza del profilo (password/email)
  arriva qui.
- **7B**: coda, webhook, preferenze e Area Fan dentro il guscio della 5.5D.
- **Fase 10**: moduli ruolo-specifici e funzioni nuove della dashboard (filtri,
  ricerca, duplica evento, azioni multiple, completezza profilo).
- **Fase 8**: pannello admin con lo stesso linguaggio visivo, senza rifare la
  struttura da zero.
- **Fase 13**: rifiniture, OG, favicon, legale e polish. Non rifà le pagine
  della 5.5.

## 13. Control room (Fase 8)

La control room è **uno strumento di lavoro**, non una pagina pubblica. Non ha
navbar pubblica, non ha player Spotify, non ha bottom bar di scoperta. Ha un
guscio suo, con “Torna al sito”, stato 2FA e uscita.

### Struttura

- **Desktop**: sidebar a gruppi, larghezza fissa, contenuto su una colonna.
- **Mobile**: tab orizzontali raggruppati, non quindici voci in fila; le tabelle
  diventano card espandibili o righe con dettaglio.
- **Una rotta per modulo** (`/admin/<modulo>`), non una pagina unica che carica
  tutto. L'overview aggrega solo conteggi e code.
- **Overview**: prima “Da fare adesso”, poi i KPI. Ogni KPI è cliccabile e porta
  alla lista già filtrata.
- **Filtri nell'URL**, paginazione server-side, export CSV/JSON, stati di
  caricamento/vuoto/errore.
- **Ricerca globale** in seguito, con scorciatoia Ctrl+K per utenti, eventi,
  artisti, locali e messaggi.

### Linguaggio visivo

- Fondo `bg`, pannelli `surface` con bordo `line`; niente glass dietro a tabelle
  lunghe.
- Etichette mono maiuscole, numeri KPI in Space Grotesk, titoli in Anton solo
  per la testata.
- Tre accenti con ruoli: viola per l'azione primaria, ciano per informazione e
  stato attivo, rosa per problemi, annullamenti e segnalazioni. **Niente
  giallo.**
- Tabelle dense ma leggibili: intestazioni mono, righe separate da `line`,
  stato sempre testo + colore.
- Niente card dentro card, niente gradienti decorativi, niente metriche finte.

### Moduli e registro

I moduli si raggruppano in:

- **Oggi**: panoramica, cose da fare, alert.
- **Persone**: utenti, artisti, locali, claim e verifiche, sospensioni.
- **Contenuti**: eventi, bozze, annullati, segnalazioni, città, generi, media.
- **Community**: messaggi contatti, segnalazioni, follow, inviti.
- **Comunicazione**: email, coda, log, quota Resend, notifiche in-app, template.
- **Sistema**: impostazioni, admin, audit, jobs, backup, feature flag.

Ogni modulo è descritto da un **registro**: chiave, nome, gruppo, icona,
permesso, rotta, badge, descrizione, ordine. Aggiungere un pannello deve essere
un'operazione ordinata, non una modifica al buio. La lista finale si completa
con il proprietario prima della Fase 8 (`docs/plan-fase-8.md`).

### Sicurezza e azioni

- 2FA (AAL2) obbligatoria per l'admin.
- Audit log per ogni azione che cambia dati.
- Conferma esplicita per eliminare, sospendere, annullare o inviare in massa.
- “Retry failed” a lotti, con dry run e controllo quota; mai 542 invii in un
  clic.
- Errori del provider sanitizzati: niente URL, token o API key nell'interfaccia.
- Nessun dato personale in più di quanto serve; export tracciati.

## 14. Notifiche in-app

- Campanella in navbar per i loggati, badge unread reale; pagina dentro l'area
  personale.
- Notifica = fatto azionabile, non metrica di vanità. Niente “nuovo follower”,
  “qualcuno ha salvato”, “visualizzazioni”.
- Raggruppa gli eventi simili (“3 nuovi eventi da artisti che segui”) e usa
  `dedupe_key`.
- Priorità: critica, normale, bassa. Le critiche restano visibili anche con le
  preferenze non critiche disattivate.
- Link diretto all'evento, alla scheda o all'account; “segna tutte come lette”.
- Retention 90 giorni; niente realtime nella prima versione.
- Il digest settimanale è opt-in, massimo una email a settimana, solo se c'è
  qualcosa. La politica completa è in `docs/notifications-email-policy.md`.
