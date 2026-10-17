/**
 * Costanti di paginazione.
 *
 * Vivono qui (e non dentro il componente) perché il valore serve anche ai
 * Server Component: importare una costante da un modulo `"use client"` la
 * trasforma in un *client reference*, non nel numero vero.
 */
export const ITEMS_PER_PAGE = 12;

/**
 * Parametri da conservare nei link di paginazione.
 *
 * Serve a non perdere i filtri cambiando pagina: i valori vuoti non entrano
 * nella query string, così gli indirizzi restano puliti.
 */
export function paginationParams(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
}
