"use client";

import { useEffect, type RefObject } from "react";

/**
 * Chiude un pannello con Esc e riporta il focus al pulsante che l'ha aperto.
 *
 * Un menu o un avviso che si apre sopra la pagina deve potersi chiudere da
 * tastiera: senza questo, chi non usa il mouse resta dentro (o fuori) senza via
 * d'uscita. È un hook minuscolo apposta: tre pannelli, una regola sola.
 */
export function useDismissible(options: {
  open: boolean;
  onClose: () => void;
  /** Il contenitore del pannello: il primo elemento focusabile riceve il focus. */
  panelRef?: RefObject<HTMLElement | null>;
  /** Il pulsante che l'ha aperto: qui torna il focus alla chiusura. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Sposta il focus dentro il pannello all'apertura (per gli avvisi modali). */
  moveFocus?: boolean;
}): void {
  const { open, onClose, panelRef, returnFocusRef, moveFocus = false } = options;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    if (moveFocus) {
      const panel = panelRef?.current;
      const focusable = panel?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? panel)?.focus();
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Il focus torna sempre al pulsante che ha aperto il pannello: chi usa la
      // tastiera non deve ricominciare dall'inizio della pagina.
      returnFocusRef?.current?.focus();
    };
  }, [open, onClose, panelRef, returnFocusRef, moveFocus]);
}
