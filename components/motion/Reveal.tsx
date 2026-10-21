"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Reveal delle sezioni sotto la piega, senza librerie di animazione.
 *
 * Il contenuto arriva dal server già visibile: se la sezione è sopra la piega
 * non viene nascosta. Solo quando è più in basso parte l'osservatore, che la
 * fa entrare con una transizione CSS di 500 ms. Con `prefers-reduced-motion`
 * non succede nulla.
 *
 * `data-reveal` è il fallback per chi naviga senza JavaScript.
 */
export default function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    // Già nello schermo: nessun motivo di nasconderlo e farlo riapparire.
    if (node.getBoundingClientRect().top <= window.innerHeight * 0.9) return;

    setHidden(true);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHidden(false);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out-expo motion-reduce:transition-none",
        hidden ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}
