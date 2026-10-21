"use client";

import { useEffect, useRef } from "react";

export type CounterItem = { label: string; value: number };

/**
 * Contatori animati della bento grid.
 *
 * I numeri veri sono già nel HTML renderizzato dal server (leggibili senza
 * JavaScript e indicizzabili); l'animazione parte solo quando la griglia entra
 * nello schermo, e viene saltata del tutto con `prefers-reduced-motion`.
 */
export default function Counters({ items }: { items: CounterItem[] }) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const targets = [...list.querySelectorAll<HTMLElement>("[data-counter]")];
    if (targets.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let started = false;

    const run = () => {
      if (started) return;
      started = true;

      const duration = 900;
      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        // Ammorbidisce la corsa finale senza librerie di animazione.
        const eased = 1 - Math.pow(1 - progress, 3);

        for (const element of targets) {
          const target = Number(element.dataset.counter ?? "0");
          element.textContent = String(Math.round(target * eased));
        }

        if (progress < 1) frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(list);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [items]);

  return (
    <ul ref={listRef} className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <li key={item.label}>
          <span
            data-counter={item.value}
            className="font-poster text-4xl font-normal leading-none tracking-tight text-white sm:text-5xl"
          >
            {item.value}
          </span>
          <span className="mt-1 block font-mono text-[10px] uppercase leading-tight tracking-[0.08em] text-muted">
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
