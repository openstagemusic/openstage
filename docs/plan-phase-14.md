# Fase 14 — Help Center

Stato: **fatta** il 31 ottobre 2026.

## Cosa c'è

- **Tabelle** `help_categories`, `help_articles`, `help_feedback` con RLS: il pubblico
  legge solo gli articoli pubblicati, l'admin vede anche le bozze; il feedback è
  anonimo e senza dati personali.
- **Contenuti**: 10 categorie e 12 guide reali in italiano e inglese (primi passi,
  account, fan/notifiche, artisti, locali, eventi, claim, privacy, segnalazioni,
  problemi tecnici). Scritte su quello che il sito fa davvero.
- **Pagina pubblica** `/aiuto`: ricerca (ILIKE con indice trigram su titolo e corpo),
  filtri per categoria, elenco guide, CTA ai contatti. Funziona anche senza JavaScript.
- **Guida** `/aiuto/[slug]`: Markdown minimale renderizzato in componenti React (niente
  HTML grezzo), feedback "utile / non utile", guide correlate, canonical.
- **`/faq`** reindirizza con 308 a `/aiuto`; il footer punta a **Aiuto**.
- **Admin** `/admin/aiuto`: elenco completo con stato, editor IT/EN con slug, categoria,
  ordine, bozza/pubblicato, eliminazione con conferma. Voce nel registro moduli.

## Scelte

- Nessun servizio esterno, nessun motore di ricerca: con queste dimensioni ILIKE +
  trigram basta e non aggiunge dipendenze.
- Markdown scritto a mano: titoli, elenchi, citazioni, grassetto, codice e link.
  Niente HTML grezzo, così un articolo non può iniettare markup.
- Il feedback non è pubblico e non è una recensione: serve a capire quale guida
  riscrivere.

## Resta (facoltativo, dopo il lancio)

- Editor delle categorie dalla control room (oggi si aggiungono da migrazione).
- Pannello feedback aggregato (utile/non utile per articolo).
- Ampliare i contenuti con i ticket reali dei primi mesi.
