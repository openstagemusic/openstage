# Report finale — chiusura e collaudo (Fase 14B)

Data: **31 ottobre 2026**. Ambiente: build di produzione locale (`npm run build` + `npm start`),
Node 24, Chrome headless. I numeri Lighthouse sono su hardware di sviluppo: contano le
differenze fra pagine, non la cifra assoluta.

---

## 1. Sintesi

| Area | Esito |
| --- | --- |
| Build | ✅ verde, 147 righe di output, nessun warning bloccante |
| TypeScript | ✅ nessun errore |
| Bundle iniziale condiviso | **103 kB** (gzip dichiarato da Next) |
| Pagina più pesante (first load) | **190 kB** — Home e editor eventi |
| Accessibilità (axe, WCAG 2.1 A/AA) | **0 violazioni** su 31 pagine × 2 viewport |
| Lighthouse accessibilità | **100** su tutte le pagine misurate |
| Lighthouse SEO | **100** su tutte le pagine misurate |
| Smoke test | **38/38 controlli** |
| Header di sicurezza | nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options (widget esclusi) |
| RLS | attiva su **tutte** le tabelle `public` |
| Query lente | nessuna: 0,1 ms sulla lista eventi, indici completi |
| Fixture di prova | rimosse (backup JSON salvato fuori dal repository) |

---

## 2. Prestazioni (Lighthouse 12)

### Desktop (1280×900, preset desktop)

| Pagina | Prestazioni | LCP | TBT | CLS |
| --- | --- | --- | --- | --- |
| Home `/it` | 99 | 1,0 s | 0 ms | 0,024 |
| Città `/it/citta` | 100 | 0,7 s | 0 ms | 0,005 |
| Locali `/it/locali` | 100 | 0,7 s | 0 ms | 0,004 |
| Scheda evento | 100 | 0,7 s | 10 ms | 0,012 |
| Aiuto `/it/aiuto` | 100 | 0,7 s | 0 ms | 0,004 |
| Mappa `/it/mappa` | **72** | 0,7 s | **680 ms** | 0,030 |

### Mobile (390×844, throttling Lighthouse: Slow 4G, CPU ×4)

| Pagina | Prestazioni | LCP | TBT | CLS |
| --- | --- | --- | --- | --- |
| Home `/it` | 79 | 4,4 s | 220 ms | 0,008 |
| Città `/it/citta` | 88 | 3,2 s | 220 ms | 0,016 |
| Locali `/it/locali` | 90 | 3,2 s | 160 ms | 0,054 |
| Scheda evento | 78 | 4,8 s | 190 ms | 0,003 |
| Aiuto `/it/aiuto` | 86 | 3,6 s | 180 ms | 0,001 |
| Mappa `/it/mappa` | **66** | 2,3 s | **3.350 ms** | 0,083 |

**Letto così:**

- Tutte le pagine di contenuto stanno fra **78 e 90** su mobile: sotto il "verde" di
  Lighthouse (90) ma con CLS quasi nullo e nessun salto di layout. Il peso vero è il
  **TTFB** (server rendering con sessione e database) più il download del documento.
- La **mappa** è l'unico caso serio: `maplibre-gl` costa ~700 kB di JavaScript e
  l'inizializzazione blocca il thread per 3,3 s su un telefono lento. Mitigazioni già
  fatte (`renderWorldCopies: false`, `maxTileCacheSize: 64`, `fadeDuration: 0`,
  caricamento dinamico del canvas): portano la pagina da 59 a 66.
- **Da fare dopo il lancio**: sulla mappa mobile caricare il canvas solo dopo un tocco
  ("Apri la mappa interattiva") oppure mostrare prima un'immagine statica MapTiler.
  È una scelta di prodotto, non un bug.

### Perché i numeri mobile non sono più alti

- Le pagine pubbliche restano **dinamiche**: leggono sessione (Preferiti) e database a
  ogni richiesta, quindi `Cache-Control: no-store` e nessun ingresso in bfcache.
  È voluto: un pulsante "Salva" sbagliato è peggio di 300 ms di TTFB.
- Le etichette mono del design system sono a **9–11 px**: Lighthouse le segnala
  (`font-size`, 45–55% di testo "legibile"). È una scelta estetica; i paragrafi sono a
  14–16 px.
- I font sono self-hosted con `next/font` (nessuna chiamata a Google Fonts).

---

## 3. Bundle e build

| Voce | Valore |
| --- | --- |
| Primo caricamento condiviso | 103 kB |
| Chunk più grande condiviso | 54,2 kB |
| Home | 190 kB first load |
| Editor evento (`/dashboard/events/[id]`) | 190 kB |
| Mappa | 183 kB (canvas MapLibre caricato a parte) |
| Middleware | 95,2 kB |
| Errori di build | nessuno |

---

## 4. Accessibilità

Vedi `docs/accessibility.md` per il dettaglio. In sintesi:

- **axe-core** (WCAG 2.1 A/AA) su **62 render** (31 pagine × desktop/mobile): **0 violazioni**.
- **Tastiera**: skip link visibile al primo Tab e funzionante; menu mobile, area personale,
  control room e avviso di registrazione si chiudono con **Esc** e restituiscono il focus.
- Corretti in questo blocco: contrasto (login, registrazione, voci "Prossimamente"),
  link nel testo, bersagli del cambio lingua, ordine dei titoli su `/artisti` e `/locali`.
- Lighthouse: **accessibilità 100** su tutte le pagine misurate.

---

## 5. Test automatici

**Smoke test** (`scripts/smoke.mjs`, Puppeteer): 38 controlli su 20 pagine pubbliche più
le schede prese dalla sitemap, `og:image`, redirect `/faq → /aiuto`, header di sicurezza,
`robots.txt` e `sitemap.xml`. Eseguito dal workflow `.github/workflows/smoke.yml` a ogni
push su `main`, su richiesta e ogni mattina alle 06:00 UTC contro **getopenstage.it**.

Cosa **non** copre: login, registrazione, creazione evento, booking. Quei percorsi si
provano a mano (vedi §7) finché non arriva Playwright (B05, parte rimanente).

---

## 6. Dati, query e sicurezza

### Query

| Controllo | Esito |
| --- | --- |
| Lista "prossime serate" (`status`, `starts_at`) | 0,125 ms — seq scan su 5 righe, corretto a questa dimensione |
| Indici su eventi | città, `city_key`, paese, data, rilevanza, geografia, trigram su titolo e città |
| Indici su locali / artisti | città, `city_key`, paese, trigram su nome, slug unico |
| Notifiche | `(user_id, created_at)`, dedupe unica |
| Ricerca guide | trigram su titolo e corpo |

Nessuna query applicativa sopra i 100 ms in `pg_stat_statements` (le voci lente sono
utility di Supabase e migrazioni).

### RLS

- **Tutte** le tabelle di `public` hanno `relrowsecurity = true`.
- Permessi delle funzioni irrigiditi (migrazione `0076`): `claim_email_batch`,
  `enqueue_weekly_digests` e le `telegram_on_*` non sono più richiamabili da `anon` e
  `authenticated` — solo dal worker con chiave di servizio e dal cron.
- `city_key` ha ora un `search_path` fisso.
- Gli avvisi residui di Supabase riguardano funzioni `security definer` che **controllano
  da sole** `is_admin()` o `auth.uid()`: restano eseguibili perché è così che il client
  le usa. Da rivedere solo se se ne aggiungono di nuove.

### Header di sicurezza

| Header | Valore |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), payment=(), geolocation=(self)` |
| `X-Frame-Options` | `DENY` — tranne `/widget/*`, che usa `frame-ancestors *` |
| `Strict-Transport-Security` | `max-age=63072000` (Vercel) |

**Non c'è una CSP completa**: Next inietta script inline e una policy senza nonce
romperebbe l'idratazione. È il primo lavoro da fare quando ci sarà tempo di testare
nonce e report-only.

---

## 7. Beta test per ruoli

Fatto in questo blocco:

| Ruolo | Cosa è stato verificato |
| --- | --- |
| Visitatore non registrato | tutte le pagine pubbliche, ricerca, schede, mappa, sitemap |
| Fan loggato | area personale, account, impostazioni, notifiche, eventi salvati |
| Artista loggato (2 account) | dashboard con la propria scheda, account, editor eventi |
| Locale loggato | dashboard, account con il nuovo campo **Paese**, editor eventi |
| Admin | control room, Help Center, moderazione |
| Screen reader / tastiera | skip link, Tab, Esc sui pannelli (vedi §4) |
| Rete lenta | misure Lighthouse mobile (§2) |

Da provare a mano prima del lancio (richiede le tue credenziali e un'email vera):

1. Registrazione completa con email + Turnstile → scelta ruolo → primo evento.
2. Pubblicazione di una serata con pin sulla mappa e locandina.
3. Salvataggio di una serata come fan e notifica ricevuta.
4. Cancellazione account (serve `SUPABASE_SERVICE_ROLE_KEY`).
5. Una segnalazione dal sito e la sua chiusura dalla control room.

---

## 8. Correzioni entrate in questo blocco

- **Paese su eventi e locali** (B60): colonna `country`, select nell'editor e
  nell'account, "Regno Unito" al posto di "Italia" sulle schede estere, JSON-LD corretto,
  città raggruppate anche per paese.
- **Ruolo scelto** (B06): `role_chosen_at` salvato al momento della scelta.
- **Limite sulle card social** (B45): 40 richieste al minuto per IP sugli endpoint OG.
- **Accessibilità** (B13): vedi §4.
- **Header di sicurezza** e **guide nella sitemap**.
- **Locandina più veloce**: `fetchpriority=high`, preload e preconnect nella scheda evento.
- **Smoke test** e workflow GitHub Actions.
- **Permessi delle funzioni** irrigiditi (`0076`).
- **Fixture rimosse**: due eventi di prova, un locale di prova, un artista di prova
  (backup JSON in `%TEMP%/opencode/openstage-backup`).

---

## 9. Cosa resta, in ordine di priorità

1. **Mappa su mobile** (§2): gate al tocco o anteprima statica. Impatto alto, lavoro medio.
2. **CSP** in report-only, poi con nonce. Impatto medio, lavoro medio.
3. **Playwright** per i flussi con login e scrittura (B05). Impatto alto sulla sicurezza
   dei rilasci, lavoro medio.
4. **Cache pubblica**: valutare `revalidate` per le schede evento senza sessione, così il
   TTFB scende e le pagine entrano in bfcache.
5. **Testo secondario 9–11 px**: se il design lo consente, salire a 11–12 px sulle
   etichette mono (aiuta la leggibilità, non la conformità).

---

## 10. Come ripetere le misure

```bash
npm run build && npm start -- -p 3000      # build di produzione in locale
node scripts/smoke.mjs                     # smoke su localhost
BASE_URL=https://getopenstage.it node scripts/smoke.mjs

npx lighthouse@12 http://localhost:3000/it --only-categories=performance,accessibility,best-practices,seo
npx lighthouse@12 http://localhost:3000/it/mappa --preset=desktop --only-categories=performance
```
