# Review blocco 3.0 — Lingua negli URL

## Perché questo blocco esiste

Le directory pubbliche (`/artisti`, `/locali`, schede) hanno senso **solo** se Google può
leggerle. Prima di questo blocco la lingua era un **cookie** deciso dal paese: lo stesso
indirizzo serviva italiano o inglese, quindi `hreflang` era impossibile e Google, che ci
crawla da IP statunitensi senza cookie, riceveva **sempre l'inglese**. La directory italiana,
per il motore di ricerca, non esisteva.

Ora ogni lingua ha il suo indirizzo: `/it/...` e `/en/...`.

## Come funziona

- Il **middleware** decide la lingua e la mette nell'indirizzo. Chi arriva senza prefisso viene
  portato su `/it/...` o `/en/...` (307 temporaneo: dipende da chi guarda, quindi non è un 301).
  La preferenza salvata vince; altrimenti si usa il paese dall'indirizzo IP.
- Le pagine **non sanno nulla della lingua**: `/it/locali` viene riscritto internamente in
  `/locali`, mentre l'indirizzo visibile resta quello localizzato. Zero file spostati.
- Lingua e percorso corrente arrivano alle Server Component via header (`x-locale`, `x-pathname`):
  `getLocale()` legge l'indirizzo, il cookie resta solo come preferenza per la prima visita.
- Il layout radice scrive **`canonical`** e **`hreflang`** (`it`, `en`, `x-default` → italiano)
  per ogni pagina, più `og:url` e `og:locale`.
- I collegamenti interni passano da `LocaleLink`, che antepone la lingua corrente. È idempotente:
  se l'URL è già localizzato lo lascia com'è.

## Le due trappole trovate e risolte

1. **Il router client non distingue le due lingue.** Con la riscrittura, `/it/mappa` e `/en/mappa`
   sono la *stessa* rotta per il router di Next: la cache interna serviva il contenuto della
   lingua precedente, e `<html lang>`/`canonical` (che appartengono al documento) restavano
   vecchi. **Provato**: dopo il cambio lingua la pagina restava in inglese.
   Rimedio: il cambio lingua fa una **navigazione completa** (`window.location.assign`). Per un
   cambio di lingua è anche concettualmente giusto: cambia il documento, non una sua parte.
2. **`usePathname()` sui componenti client restituisce il percorso riscritto** (`/locali`), non
   quello visibile (`/it/locali`). Ricavare la lingua da lì avrebbe prodotto collegamenti senza
   prefisso su tutte le pagine. Rimedio: la lingua arriva dal server con `LocaleProvider`, e
   `LocaleLink` legge quella.

## Prove fatte (browser reale, Chrome headless)

| Prova | Esito |
| --- | --- |
| `/` senza preferenza | 307 → `/en`; con cookie `it` → 307 → `/it` |
| `/locali` senza prefisso | 307 → `/en/locali` |
| `/it/locali`, `/en/artisti`, `/it` | 200 |
| `canonical` + `hreflang` su `/it/locali` | `it/locali`, `it`/`en`/`x-default` corretti |
| Clic su "Mappa" da `/en` | `/en/mappa`, lingua conservata |
| Cambio lingua da desktop e da mobile | `/it/mappa` con `lang="it"`, contenuto italiano, `canonical` aggiornato |
| Filtro rapido da `/it` | `/it?when=tonight`, lingua conservata, **scroll fermo dov'era** (600 → 600) |
| Pagina evento `/it/eventi/<id>` | lingue e `canonical` corretti, **zero** link interni senza prefisso |
| "Salva" da utente anonimo | `/it/login?next=%2Fit%2Feventi%2F…` (ritorno localizzato) |
| Errori in console | nessuno |

## Cosa non entra in questo blocco

- `sitemap.xml` e `robots.txt`: vanno in **3.1**, perché devono elencare eventi, artisti e locali
  **con i loro slug**, che arrivano con la migration di 3.1.
- `canonical` delle viste filtrate/paginate: oggi una pagina con filtri si dichiara uguale alla
  base (scelta prudente, evita duplicati). Per la paginazione la regola va rifinita in **3.1**,
  quando esisteranno le directory paginate.

## Rischi noti

| Voce | Gravità | Nota |
| --- | --- | --- |
| Redirect 307 su ogni indirizzo senza prefisso | Bassa | Riguarda solo chi arriva da un link vecchio o da uno non localizzato; i collegamenti interni sono già corretti |
| `hreflang` dichiara anche versioni con contenuti tradotti solo in parte | Bassa | L'interfaccia è tradotta, i dati (locali, città) no: è normale per una directory locale |
| Doppia lingua del cookie e dell'indirizzo | Bassa | L'indirizzo vince sempre; il middleware riallinea il cookie a ogni richiesta |
