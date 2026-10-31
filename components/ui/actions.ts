/**
 * Come si comportano i comandi, in tutto il sito.
 *
 * Regola: **un solo** primario pieno per vista. Tutto il resto è un link
 * sottolineato con la freccia, che è la lingua editoriale del progetto: niente
 * scatole con il bordo, niente pulsanti che sembrano caselle di un gestionale.
 */

export const ACTION_SOLID =
  "group inline-flex min-h-11 items-center justify-center gap-3 bg-violet-strong px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet";

export const ACTION_LINE =
  "group inline-flex items-center gap-2 border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan";

export const ACTION_MUTED =
  "group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white";

/** La freccia che si sposta: il movimento sta nel CSS, non in una libreria. */
export const ACTION_ARROW = "transition-transform group-hover:translate-x-0.5";
