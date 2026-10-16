/**
 * Costanti di paginazione.
 *
 * Vivono qui (e non dentro il componente) perché il valore serve anche ai
 * Server Component: importare una costante da un modulo `"use client"` la
 * trasforma in un *client reference*, non nel numero vero.
 */
export const ITEMS_PER_PAGE = 12;
