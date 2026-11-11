# SEO — stato e controlli (11 novembre 2026)

Fonte: Search Console (service account, sola lettura) + ispezione URL + CSV in
`docs/searchconsole/`.

## Numeri

| Cosa | Valore |
| --- | --- |
| Pagine indicate | **44** (su 68 note) — rilevazione del 6 novembre |
| Impressioni (3 mesi) | 165, concentrate dal 3 novembre (25–27 al giorno) |
| Clic | **5**, CTR 3%, posizione media ~10 |
| Italia | 4 clic, 102 impressioni |
| Mobile | 3 clic, 88 impressioni, posizione 7,2 |
| Desktop | 2 clic, 77 impressioni, posizione 12,9 |

## Problemi del report e cosa sono davvero

| Voce | Pagine | Lettura |
| --- | --- | --- |
| Rilevata, non indicizzata | 50 | Coda normale di un dominio nuovo |
| Pagina con reindirizzamento | 11 | URL senza lingua → `/it/...` |
| Esclusa con `noindex` | 5 | URL legacy di login/registrazione/dashboard/admin |
| Duplicata, canonical diversa | 1 | `/en` contro `/`: Google ha scelto `/` |
| Scansionata, non indicizzata | 1 | Una pagina giudicata simile a un'altra |

## Il problema vero (trovato l'11 novembre)

Le pagine **con lingua** erano **sconosciute a Google**:

- `/it/citta/bergamo` → unknown
- `/it/eventi/ranica/calibro-35-vs-l-a` → unknown
- `/it/login`, `/it/register`, `/it/dashboard`, `/it/admin` → unknown

Google aveva in indice gli URL **senza lingua** (`/citta/bergamo`,
`/eventi/...`), che rispondevano con un **307 temporaneo**. Un redirect
temporaneo non consolida: Google conserva l'indirizzo di partenza e non impara
mai quello definitivo.

### Correzione applicata

`middleware.ts`: i percorsi senza lingua (tranne `/`) ora rispondono **308**
verso `/it/...`.

```
/citta/bergamo                     308 → /it/citta/bergamo
/eventi/ranica/calibro-35-vs-l-a   308 → /it/eventi/ranica/calibro-35-vs-l-a
/                                   307 → /it (o /en, in base alla lingua)
```

La home resta a 307 di proposito: deve scegliere la lingua da chi arriva. Il
prezzo è che Google può tenere `/` e `/it` come due home. Scelta accettata: il
beneficio SEO non vale la perdita del rilevamento lingua.

### Titoli delle schede evento

Aggiunto il locale quando non è già nel titolo:

- `CALIBRO 35 vs L.A. · Druso · OpenStage`
- `Giorgio Canali — Rossosolo Live · NXT Station · OpenStage`
- `Nuovi Suoni Live — Semifinale al NXT · OpenStage` (invariato: NXT c'è già)

Motivo: la query «calibro 35 druso» era in prima pagina (pos 7,8) con 0 clic.

## Cosa controllare, senza toccare niente

Tra **una settimana** (18 novembre):

1. **Pagine**: gli URL senza lingua devono calare e comparire quelli `/it/...`.
2. **Duplicata**: deve restare 1 sola (`/en` contro `/`). Se cresce, c'è un
   problema nuovo.
3. **Ispezione URL** su `/it/citta/bergamo` e su una scheda evento: devono
   passare da «unknown» a «scansionata».
4. **Query**: «calibro 35 druso» deve iniziare a prendere clic, se il titolo
   funziona.

Se dopo due settimane le schede sono ancora «sconosciute», si sollecita
l'ispezione dalla UI, una per una (l'API non permette di chiedere
l'indicizzazione, solo di leggere).

## Da non fare

- Non cambiare di nuovo i redirect: ogni modifica riavvia il conteggio.
- Non chiedere l'indicizzazione di venti URL a mano: non serve e consuma la
  quota.
- Non toccare canonical e hreflang: verificati corretti.

## Nota

La SEO non è il collo di bottiglia. Con 1 artista reclamato, 0 locali e 9 serate
future, un locale che mette il link alla sua scheda sul proprio sito vale più di
dieci correzioni tecniche.
