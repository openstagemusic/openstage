/**
 * Indirizzo pubblico del sito.
 *
 * Arriva da `NEXT_PUBLIC_SITE_URL`: cambiando dominio (per esempio al lancio con
 * il dominio definitivo) si aggiorna solo quella variabile su Vercel, non il
 * codice. Serve a mappa del sito, `robots.txt` e dati strutturati, che devono
 * contenere indirizzi assoluti.
 */
export function getSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  return (raw || "http://localhost:3000").replace(/\/+$/, "");
}

/** Indirizzo assoluto a partire da un percorso interno (`/artisti/x`). */
export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
