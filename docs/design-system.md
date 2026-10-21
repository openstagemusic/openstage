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
- barra fissa in basso (Esplora · Mappa · Artisti · Locali · Profilo) sulle
  pagine di scoperta, nascosta in dashboard/admin/auth/form lunghi;
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
