# Fase 5 — Remake grafico, parte 1

> Approvata il 21 ottobre 2026. Obiettivo: dare a OpenStage un sistema visivo
> riconoscibile e un guscio mobile-first, senza riscrivere la logica.

## Cosa entra

- **Sistema**: token definitivi in `app/globals.css` (colori, superfici, bordi,
  raggi, ombre, easing), tipografia, spazi, focus visibile, skip link.
- **Movimento**: reveal CSS + `IntersectionObserver` (`components/motion/Reveal.tsx`).
  Framer Motion è stato valutato e rimandato alla Fase 13: nella prova aggiungeva
  ~45 KB gzip per un solo fade.
- **Guscio**: navbar, footer, player Spotify, barra mobile in basso.
- **Home**: hero, sezione breve “Cos'è OpenStage / cosa facciamo” (richiesta
  esplicita del proprietario), bento grid, contatori, mappa con caricamento
  pigro, card evento.
- **Schede**: testata di evento, artista e locale; liste artisti/locali.
- **QA**: build, Lighthouse mobile, 360/768/1280 px, italiano/inglese,
  reduced motion, tastiera, controllo in produzione su Vercel.

## Cosa non entra

- S6 “serate simili” e S7 “visti di recente”: sono funzioni, non grafica.
- Riscrittura di form, editor eventi, dashboard, admin.
- Page transition globali, video hero, WebGL decorativo.
- Nuovi servizi esterni, nuove tabelle, nuove variabili d'ambiente.

## Decisioni

1. Palette attuale (viola/ciano/rosa) con ruoli fissi. **Niente verde acido.**
2. Mappa subito sotto l'hero, non dentro: inizializzazione pigra e skeleton.
3. Barra mobile fissa in basso sulle pagine di scoperta; nascosta in
   dashboard/admin/auth. Player Spotify sopra la barra.
4. Movimento con CSS + `IntersectionObserver`; Framer Motion solo in Fase 13
   per le interazioni complesse, con budget ≤ 20 KB.
5. S6/S7 fuori dalla Fase 5.
6. Sezione “Cos'è OpenStage” in Home: tre punti brevi + link a `/about` e
   `/per-gli-artisti`, per far capire subito dove si è.

## Blocchi e commit

| Blocco | Contenuto | Commit |
| --- | --- | --- |
| 5.1 | Design system, token, reveal CSS, skip link, navbar, footer, player, barra mobile | `Fase 5.1` |
| 5.2 | Hero, sezione “Cos'è OpenStage”, bento, mappa pigra, card evento | `Fase 5.2` |
| 5.3 | Liste artisti/locali, testate schede, QA e rifiniture | `Fase 5` |

## Servizi esterni

Nessuno. Nessuna nuova dipendenza npm, nessuna variabile d'ambiente, nessuna
migration SQL.

## Criteri di accettazione

- `npm run build` verde.
- Lighthouse mobile: performance ≥ 85, accessibilità 100.
- Nessun contenuto critico invisibile senza JavaScript.
- Reduced motion rispettato su tutte le animazioni.
- Nessuna regressione su auth, dashboard, creazione evento, mappa, admin.
- Deploy di produzione testabile su Vercel.

## 5.4 — Home poster wall (concept 01, approvato il 21 ottobre 2026)

Il proprietario ha scelto il concept “Muro di locandine” e ha chiesto
animazioni. La Home viene ricostruita senza card e senza contenitori arrotondati:
il muro di locandine reali è l'hero, il calendario è una lista a righe, la mappa
è una fascia a tutta pagina. Il resto del sito resta invariato, a parte il guscio
(navbar, footer, switcher lingua) allineato alla nuova direzione.

### Cosa entra

- **Tipografia**: Anton per i titoli-poster, IBM Plex Mono per etichette e
  metadati; Inter e Space Grotesk restano per corpo e interfaccia.
- **Hero**: muro di 3–4 locandine reali, titolo “Stasera si suona.”, ingresso
  sfalsato delle locandine, hover sobrio, nessuna immagine di repertorio.
- **Lista eventi**: righe editoriali (data grande, titolo, luogo/genere, orario,
  ingresso), hover con sweep viola e freccia; niente schede.
- **Ricerca e filtri**: variante “editoriale” senza pillole/glass, usata solo in
  Home; la pagina `/mappa` mantiene la variante attuale.
- **Mappa**: fascia a tutta pagina, con intestazione editoriale e pin live.
- **Cos'è OpenStage**: statement + tre punti a righe + claim “Gratis. Per sempre.
  Per chi suona.”; la sezione resta breve e chiara.
- **Come funziona**: tre passi, contatori reali e due porte (artisti/locali)
  senza bento grid.
- **Movimento**: entrata del titolo, stagger delle locandine, reveal delle
  sezioni con `IntersectionObserver`, hover delle righe, puntino live. Solo CSS
  e `transform`/`opacity`; nessuna libreria, nessun loop decorativo.
- **Guscio**: navbar/footer/language switcher con bordi netti, etichette mono e
  CTA rettangolari; stessa funzionalità, stessa accessibilità.

### Cosa non entra

- Nuovi servizi, dipendenze npm, variabili d'ambiente o migration SQL.
- Cambi a dashboard, editor, admin, auth, pagine artista/locale.
- Framer Motion (resta in Fase 13).
- Marquee infinito o parallax: il ticker è una fascia statica che entra una
  volta, non un loop.

### Criteri di accettazione

- `npm run build` verde e nessun overflow orizzontale a 390/1280 px.
- H1 unico, contrasto AA, focus visibile, target ≥ 44 px.
- Animazioni disattivate con `prefers-reduced-motion`; contenuto leggibile
  senza JavaScript.
- Nessuna regressione su ricerca, filtri, mappa, paginazione, lingua.
- Commit `Fase 5.4`, deploy verificabile su Vercel.
