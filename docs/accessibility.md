# Accessibilità — verifica pre-lancio (B13)

Verifica fatta il 31 ottobre 2026 sulla build di produzione locale (`npm run build` +
`npm start`), non sul dev server: il dev server serve CSS non ottimizzato e falsa i
contrasti.

## Come

- **axe-core 4.x** iniettato in pagina con Puppeteer, regole `wcag2a`, `wcag2aa`,
  `wcag21a`, `wcag21aa`.
- **31 pagine × 2 viewport** (1280×900 desktop, 390×844 mobile) = 62 render.
- **Navigazione da tastiera** provata a mano con Puppeteer: skip link, Tab,
  Enter, Escape sui pannelli.

## Risultato

| Controllo | Esito |
| --- | --- |
| Violazioni WCAG 2.1 A/AA (axe) | **0** su 62 render |
| Pagine con risposta 4xx | 0 |
| Skip link («Vai al contenuto») | visibile al primo Tab, portа il focus a `<main id="contenuto">` |
| Menu mobile, area personale, control room | Esc chiude, il focus entra nel pannello e torna al pulsante |
| Avviso «controlla la posta» (registrazione) | `role="dialog"`, `aria-modal`, Esc chiude, focus sul pulsante di chiusura |
| Cambio lingua IT/EN | area di tocco ≥ 24×24 px, `aria-pressed` |

## Cosa è stato corretto in questo blocco

1. **Menu mobile** (`Navbar`): Esc chiude e il focus torna al pulsante del menu.
2. **Area personale** (`DashboardShell`) e **control room** (`AdminShell`): il
   pannello laterale è un `role="dialog"` con `aria-modal`, riceve il focus
   all'apertura, si chiude con Esc e restituisce il focus.
3. **Avviso post-registrazione** (`RegisterForm`): focus gestito, Esc, `aria-describedby`.
4. **Contrasto**: tolti `text-muted/70` (login/registrazione) e `opacity-60` sulle voci
   «Prossimamente» della control room, che scendevano a 3,35:1 su testo da 8–10 px.
5. **Link dentro i paragrafi** (login, registrazione, contatti, notice & takedown):
   sottolineatura sempre visibile, non solo al passaggio del mouse.
6. **Cambio lingua**: bersaglio minimo 24×24 px.

Nuovo hook condiviso: `lib/ui/use-dismissible.ts` (Esc + gestione del focus per i
tre pannelli).

## Cosa resta fuori (consapevolmente)

- La mappa MapLibre è un canvas: la si può usare con la tastiera (frecce, zoom) ma
  non è un'esperienza paragonabile. La stessa informazione resta disponibile in
  elenco, che è il percorso principale.
- Il player Spotify è click-to-load: finché non lo si attiva non carica iframe di
  terze parti.
- `prefers-reduced-motion`: le animazioni CSS usano la media query; il parallax
  dell'hero si spegne. Da ricontrollare a ogni nuova animazione.
