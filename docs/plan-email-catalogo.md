# Catalogo delle email automatiche

Fatto il **1 novembre 2026**.

## Cosa c'è

- Tabella `email_templates`: una riga per ogni email che OpenStage manda.
  Colonne: slug, nome, categoria, fonte, destinatario, quando parte, variabili,
  oggetto e corpo in IT/EN, nota, se è modificabile.
- **13 email a catalogo**, in tre gruppi:
  - **5 modificabili da qui** (`source = 'app'`): nuovo messaggio dal modulo
    contatti, risposta dell'assistenza, notice & takedown (avviso, conferma,
    esito). Il codice le legge dal database a ogni invio.
  - **4 di sola lettura dalla coda** (`source = 'queue'`): riepilogo settimanale,
    account sospeso, account ripristinato, invito a reclamare una scheda. Il testo
    lo compone una funzione SQL al momento dell'invio.
  - **4 di Supabase** (`source = 'supabase'`): conferma iscrizione, recupero
    password, link di accesso, cambio email. Si modificano nel pannello Supabase.
- Pagina `/admin/email/catalogo` (gruppo Comunicazione) e dettaglio
  `/admin/email/catalogo/[slug]` con editor, variabili e anteprima del testo.
- La risposta dell'assistenza ora segue la **lingua del ticket** (prima era
  sempre in italiano).

## Scelte

- **Testo semplice, non HTML.** Il corpo si scrive come un'email normale; l'HTML
  lo genera il codice. Così chi scrive non può rompere il layout e la versione
  testo resta identica a quella HTML.
- **Segnaposto `{{variabile}}`.** Le variabili disponibili sono elencate nella
  pagina e sostituite al momento dell'invio.
- **Il codice resta la rete di sicurezza.** Se la tabella non risponde si usa il
  testo di riserva in `lib/email/templates.ts` (`APP_FALLBACKS`), identico a
  quello che c'era prima: un guasto al database non deve fermare le email di
  assistenza.
- **Le email che non si possono modificare lo dicono.** Invece di un editor che
  non salva, la pagina spiega dove si cambiano davvero.

## Perché non tutte sono modificabili

Le email di coda nascono dentro funzioni SQL che compongono anche le parti
dinamiche (la lista delle serate nel riepilogo, il link del claim). Per renderle
modificabili servirebbe spostare la composizione nel codice: si può fare, ma è
un lavoro a sé e va fatto quando quelle email avranno bisogno di una revisione
vera.

## Dopo

- Se una email di coda va cambiata spesso, si sposta la composizione in
  `lib/email` e diventa modificabile come le altre.
- Il catalogo è anche il posto giusto per un futuro "invia una prova a me".
