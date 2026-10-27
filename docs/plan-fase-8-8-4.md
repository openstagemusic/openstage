# Fase 8.8.4 - Qualità dati e doppioni (deterministica)

> **Stato: in corso.** Scritto il 27 ottobre 2026.
> Scelta approvata: partire **senza AI**. L'audit AI arriverà quando i volumi
> lo giustificheranno, riusando `ai_runs`, il budget e il modello già presenti.

## Obiettivo

Una pagina della control room che mostri, con dati reali, dove i dati di
OpenStage sono incompleti o rischiano di duplicarsi. Nessuna correzione
automatica: ogni riga porta alla scheda da aprire e sistemare.

## Cosa entra

- Rotta `/admin/qualita`, voce **Qualità dati** nel gruppo Contenuti.
- **Eventi da controllare**: senza città, senza artista/locale collegato,
  pubblicati ma già passati, senza copertina, senza prezzo, con data sospetta,
  coinvolti in un possibile doppione.
- **Artisti**: città/genere/bio/Spotify mancanti, nessun evento collegato,
  scheda libera da reclamare, possibile doppione.
- **Locali**: città/indirizzo/coordinate/sito mancanti, nessun evento collegato,
  scheda libera da reclamare, possibile doppione.
- **Possibili doppioni**: confronto deterministico tra nomi normalizzati
  (minuscole, accenti, punteggiatura, articoli iniziali) e, per i locali, stessa
  città; per gli eventi stesso titolo normalizzato e stesso giorno.
- Link diretti: evento → editor in dashboard; scheda → pagina pubblica e lista
  admin per invito/verifica.
- Etichette IT/EN nei dizionari, pagina `noindex`, accesso solo admin.

## Cosa non entra

- Nessuna chiamata AI e nessun costo per esecuzione.
- Nessuna fusione automatica di schede o eventi.
- Nessuna modifica al database: si usano tabelle e colonne esistenti.
- Nessun nuovo servizio esterno, nessuna variabile d'ambiente.

## Dati e limiti

- Letture dirette da `events`, `artists`, `venues` con le policy admin.
- Confronto doppioni in memoria, con limite per non pesare sulla pagina.
- I controlli sono **indicazioni**: un prezzo assente o una bio vuota non
  bloccano la pubblicazione.

## QA

- [ ] Pagina raggiungibile dalla sidebar admin, IT ed EN.
- [ ] I numeri corrispondono alle query reali.
- [ ] Un evento passato pubblicato compare nella lista.
- [ ] Una scheda senza eventi compare nella lista.
- [ ] Un doppione creato di proposito compare e viene rimosso dopo il test.
- [ ] `npm run build` verde, deploy e commit.
