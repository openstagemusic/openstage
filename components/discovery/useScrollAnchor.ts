"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Tiene ferma la pagina quando cambiano ricerca o filtri.
 *
 * `router.push(..., { scroll: false })` dovrebbe bastare, ma alcuni browser —
 * tipicamente quando si sceglie da un menu a tendina **nativo** su mobile —
 * riportano comunque la pagina in cima. Qui si annota la posizione prima della
 * navigazione e, solo se il browser ha davvero saltato all'inizio, si torna
 * indietro. Se la posizione è stata mantenuta non fa nulla.
 *
 * Restituisce la funzione da chiamare **prima** di navigare.
 */
export function useScrollAnchor(): () => void {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const anchor = useRef<number | null>(null);

  useEffect(() => {
    const target = anchor.current;
    anchor.current = null;

    if (target === null || target <= 0) return;
    if (window.scrollY !== 0) return;

    const max = Math.max(0, document.body.scrollHeight - window.innerHeight);
    window.scrollTo({ top: Math.min(target, max) });
  }, [pathname, searchParams]);

  return () => {
    anchor.current = window.scrollY;
  };
}
