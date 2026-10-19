/**
 * Gli errori delle locandine, come **codici**.
 *
 * Stessa regola degli errori dell'editor: qui non ci sono frasi, la traduzione
 * sta nei dizionari, così italiano e inglese non possono dire cose diverse da
 * quello che è successo davvero.
 *
 * Vivono in un file a parte perché li nominano tutti: il caricamento (browser),
 * il disegno della locandina e i dizionari.
 */
export type CoverErrorCode =
  /** Il file non è un'immagine fra quelle ammesse. */
  | "type"
  /** Pesa più del tetto, anche dopo il ridimensionamento. */
  | "tooBig"
  /** Il browser non riesce a leggerlo come immagine. */
  | "unreadable"
  /** Il disegno della locandina non è riuscito. */
  | "generateFailed"
  /** L'archivio non ha accettato il caricamento. */
  | "uploadFailed";
