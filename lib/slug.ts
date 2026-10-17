/**
 * Da nome a indirizzo, lato applicazione.
 *
 * Fa la stessa cosa di `public.slugify` nel database (minuscole, accenti
 * normalizzati, tutto il resto ridotto a trattini). Gli slug di artisti, locali
 * ed eventi sono già salvati in tabella: questa copia serve solo a comporre i
 * pezzi variabili dell'indirizzo (per esempio la città di un evento).
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
