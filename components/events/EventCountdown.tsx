"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type EventCountdownProps = {
  /** Quando comincia, in ISO (`2026-11-08T20:30:00+00:00`). */
  startsAt: string;
  labels: {
    in: string;
    days: string;
    hours: string;
    minutes: string;
    soon: string;
  };
  className?: string;
};

/**
 * Quanto manca alla serata.
 *
 * Si calcola **nel browser**, non sul server: l'ora del server e quella del
 * telefono possono non coincidere, e un conto fatto una volta sola invecchierebbe
 * subito. Fino al primo istante dopo il caricamento non si mostra niente — meglio
 * un attimo di spazio vuoto che un numero che cambia sotto gli occhi.
 *
 * Quando la serata è cominciata sparisce: non serve dire "è iniziata" a chi sta
 * leggendo la pagina, e non sappiamo a che ora finisce.
 */
export default function EventCountdown({ startsAt, labels, className }: EventCountdownProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(startsAt).getTime();
    if (!Number.isFinite(target)) return;

    const tick = () => setRemaining(target - Date.now());
    tick();

    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [startsAt]);

  if (remaining === null || remaining <= 0) return null;

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor(remaining / 60_000);

  const text =
    days >= 1
      ? `${labels.in} ${days} ${labels.days}`
      : hours >= 1
        ? `${labels.in} ${hours} ${labels.hours}`
        : minutes >= 1
          ? `${labels.in} ${minutes} ${labels.minutes}`
          : labels.soon;

  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1.5 text-xs font-medium text-cyan",
        className
      )}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
      </span>
      {text}
    </p>
  );
}
