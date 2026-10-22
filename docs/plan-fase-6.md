# Fase 6 — Fiducia pubblica e densità locale

> **Stato: 6.1 completata il 22 ottobre 2026; 6.2 e 6.3 ancora da fare.**
> Approvata la direzione il 22 ottobre 2026. Obiettivo: sostituire i segnaposto con
> pagine pubbliche vere e rendere OpenStage trovabile **città per città**, senza
> aggiungere servizi esterni e senza toccare il modello di business.

## Decisione di prodotto

La fase successiva non è una copia di Shotgun. È il passo che rende credibile la
frase "mappa gratuita e indipendente del live italiano":

1. **Pagine pubbliche reali** — chi arriva da Google, da un link condiviso o dal
   footer deve capire chi siamo, cosa offriamo a artisti e locali e come
   contattarci.
2. **Città prima delle nazioni** — la densità locale è il principio numero uno.
   Le pagine città sono la leva SEO più forte e usano dati già presenti.
3. **Niente funzioni social premature** — follow, banner artista, album e
   contatori arrivano solo quando hanno un motivo per esistere (email,
   notifiche, profili pubblici curati).

## Cosa entra

### 6.1 — Pagine pubbliche ed editoriali

- `/about` — Chi siamo: storia, principi, cosa è OpenStage e cosa non è.
- `/per-gli-artisti` — cosa ottiene un artista, come reclamare la scheda, come
  pubblicare, quanto costa (zero).
- `/per-le-venue` — stessa cosa dal punto di vista del locale: programmazione,
  dashboard, claim, pubblico locale.
- `/contatti` — form reale che scrive in database, con conferma e stato di
  errore. Nessun `mailto:` travestito da form.
- `/faq` — nuova pagina con le domande reali già raccolte nel manuale.
- Footer: link reali a FAQ, social e playlist **solo se esistono URL veri**;
  niente link finti o vicoli ciechi.
- Copy italiano e inglese, senza numeri inventati, testimonianze finte o
  promesse non verificabili.

### 6.2 — Città e densità locale

- `/citta` — indice delle città con almeno una serata pubblicata.
- `/citta/[city]` — pagina città con:
  - prossime serate (riuso delle query e delle righe della Home);
  - artisti e locali della città;
  - link a mappa filtrata;
  - metadati, `canonical`, JSON-LD e link interni.
- Soglia editoriale: le città con pochissime serate restano raggiungibili ma
  `noindex`, per non creare pagine sottili. La soglia esatta si fissa in
  implementazione (indicativamente 3 serate future).
- Le città vengono dai dati reali (`city_key`), non da un elenco hardcodato.
- Le pagine città entrano nella sitemap solo quando superano la soglia.
- Link alle città dal footer e dalle schede evento, senza affollare la navbar.

### 6.3 — Contatti e moderazione minima

- Tabella `contact_messages` con nome, email, oggetto, messaggio, lingua,
  stato e date.
- Form pubblico con honeypot e limite di lunghezza; nessun servizio captcha
  nuovo in questa fase.
- Coda messaggi visibile solo all'admin, dentro `/admin` o in una pagina
  dedicata `/admin/messaggi`.
- Nessuna email automatica: l'email arriva con la Fase 7.

## Cosa non entra

- **Lineup multiplo** e **organizzatore come entità separata**: richiedono
  schema e moderazione. Non si improvvisano con testo libero.
- **Follow** artista/locale: prima serve l'email della Fase 7, altrimenti è un
  pulsante che non produce nulla.
- **Banner e avatar artista**, **album/discografia**, **contatori follower**:
  rinviati alle fasi profili/community/musica.
- **Checkout e biglietteria**: mai. Resta il link esterno quando esiste.
- **Pagine nazioni**: l'Italia è il mercato; l'inglese serve per turisti ed
  expat, non per aprire altri paesi.
- **Recensioni, valutazioni, "interessati" pubblici**: contrari alla filosofia.
- **Framer Motion**: continua la linea CSS + `IntersectionObserver`.

## Servizi esterni e variabili

**Nessun servizio nuovo.** Non serve Resend, non serve un dominio nuovo, non
servono MapTiler o PayPal. Si usa Supabase già configurato.

**Nessuna variabile d'ambiente obbligatoria nuova.**

Dipendenze facoltative di contenuto, non tecniche:

- URL reali di Instagram, Spotify e altri social, se esistono. Se non ci sono,
  il footer non li mostra: meglio nessun link che un link vuoto.
- Testi redazionali: li preparo io partendo dai principi del progetto; il
  proprietario li rilegge e li corregge.

## Database e SQL

Una sola migration nuova, con il primo numero libero dopo `0027`:

- `contact_messages`: tabella, indici, RLS (insert pubblico, select/update solo
  admin) e stato (`new`/`read`/`closed`).

Nessuna modifica alle tabelle esistenti. Nessun dato finto.

## SEO e contenuti

- metadata per ogni pagina, con titolo e descrizione reali;
- `canonical` e `hreflang` coerenti con `/it` e `/en`;
- JSON-LD `AboutPage`, `ContactPage`, `FAQPage`, `CollectionPage` dove ha senso;
- sitemap aggiornata con pagine pubbliche e città indicizzabili;
- nessun contenuto duplicato tra pagine città;
- FAQ con testo utile, non parole chiave ripetute.

## Design

- Stile coerente con la Home 5.4: bordi netti, etichette mono, titoli poster,
  niente card inutili.
- Glass solo su navbar, form e pannelli funzionali; mai dietro testi lunghi.
- Mobile first, 320/390/1280 px.
- Animazioni CSS sobrie, `prefers-reduced-motion` rispettato.
- Nessuna nuova dipendenza npm.

## Ordine di lavoro

1. Migration `contact_messages` e query.
2. Componenti editoriali condivisi (testata, sezioni, CTA).
3. `/about`, `/per-gli-artisti`, `/per-le-venue`, `/faq`.
4. `/contatti` + coda admin.
5. `/citta` e `/citta/[city]`, con soglia e sitemap.
6. Footer e link interni.
7. Build, QA, produzione, commit "Fase 6".

## QA

- build locale senza errori;
- 320, 390 e 1280 px senza overflow;
- italiano e inglese;
- form contatti: invio valido, honeypot, errore di rete, messaggio visibile
  all'admin;
- città con 0, 1, 3 e molte serate: stato vuoto, `noindex`, indicizzazione;
- link del footer e della navbar senza vicoli ciechi;
- `prefers-reduced-motion`;
- controllo in produzione su Vercel dopo il push.

## Rischi e mitigazioni

| Rischio | Mitigazione |
| --- | --- |
| Pagine città vuote o duplicate | Soglia, `noindex`, testi specifici per città, niente pagine generate in anticipo senza dati |
| Form contatti usato come spam | Honeypot, lunghezze massime, rate limit semplice; captcha solo se serve davvero |
| Copy troppo "marketing" | Si parte dai principi e da esempi reali; niente numeri o testimonianze inventate |
| Fase troppo grande | 6.1 e 6.2 sono blocchi separati e verificabili; se serve, si ferma dopo 6.1 |
| Social/playlist senza URL | Si nascondono, non si inventano |

## Criterio di chiusura

La fase è chiusa quando:

- le cinque pagine pubbliche sono reali in italiano e inglese;
- il form contatti scrive davvero nel database e l'admin lo vede;
- le città indicizzabili sono generate dai dati reali e quelle sottili sono
  `noindex`;
- build e produzione sono verdi;
- esiste il commit "Fase 6".
