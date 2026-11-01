"use client";

import type { ReactNode } from "react";

import { formatEventDate } from "@/lib/events/format";
import { hasCoordinates, type PublicEvent } from "@/lib/events/types";
import type { Locale } from "@/lib/i18n/config";

/**
 * «Apri la mappa».
 *
 * Su telefono la mappa vettoriale (MapLibre) pesa quasi un megabyte di
 * JavaScript e blocca il thread per qualche secondo: il resto della pagina
 * sarebbe già pronto e leggibile mentre quella lavora. Qui la mappa si carica
 * **solo quando la si chiede**, e prima si vede qualcosa di vero, non un poster
 * finto: quante serate ci sono e quali sono le prossime.
 *
 * L'anteprima non è una mappa disegnata male: è un invito con i dati giusti.
 */
export default function MapTapGate({
  events,
  locale,
  labels,
  onOpen,
}: {
  events: PublicEvent[];
  locale: Locale;
  labels: {
    title: string;
    text: string;
    cta: string;
    note: string;
    eventOne: string;
    eventMany: string;
  };
  /** Il contenuto vero (la mappa) viene montato solo da qui in poi. */
  onOpen: () => void;
  children?: ReactNode;
}) {
  const located = events.filter(hasCoordinates);
  const next = [...located]
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);

  const count = `${located.length} ${
    located.length === 1 ? labels.eventOne : labels.eventMany
  }`;

  return (
    <div
      /* Sopra i filtri della pagina /mappa: è il primo strato, non un riquadro
         dentro qualcos'altro. */
      className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-surface px-6 text-center"
    >
      {/* Griglia decorativa: dice "qui c'è una mappa" senza fingere dei pin. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at 50% 45%, black 20%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 45%, black 20%, transparent 72%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-violet/25 via-bg/60 to-cyan/15"
      />

      <div className="relative flex max-w-md flex-col items-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{count}</p>

        <h2 className="mt-3 text-balance font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-4xl">
          {labels.title}
        </h2>

        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{labels.text}</p>

        {next.length > 0 ? (
          <ul className="mt-5 w-full space-y-1.5 border-y border-line py-3 text-left">
            {next.map((event) => {
              const when = formatEventDate(event.startsAt, event.timezone, locale);
              return (
                <li key={event.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-white/90">{event.title}</span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {when.date}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        <button
          type="button"
          onClick={onOpen}
          className="mt-6 inline-flex min-h-12 items-center gap-2 bg-violet-strong px-6 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
        >
          {labels.cta} <span aria-hidden="true">→</span>
        </button>

        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {labels.note}
        </p>
      </div>
    </div>
  );
}
