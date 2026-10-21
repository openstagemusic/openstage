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
