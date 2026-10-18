"use client";

import Link from "@/components/i18n/LocaleLink";
import { useEffect, useState } from "react";

import { formatEventDate } from "@/lib/events/format";
import { eventPath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import type { VenueGroup } from "@/lib/map/venues";
import { cn } from "@/lib/utils";

type VenueEventsCardProps = {
  group: VenueGroup;
  locale: Locale;
  /** `popup`: scheda compatta nel pop-up ancorato al pin. `sheet`: bottom sheet mobile. */
  variant?: "popup" | "sheet";
  onClose?: () => void;
};

const NAV_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-base leading-none text-white transition-colors hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35";

/**
 * Scheda di un locale con più serate: il pin è uno solo, qui le date si
 * scorrono **una alla volta** con le frecce.
 *
 * Mostrarle tutte insieme faceva crescere la scheda oltre la mappa e il pop-up
 * finiva tagliato (soprattutto con molte date). Una serata per volta tiene la
 * scheda sempre della stessa altezza, e le frecce numerate dicono subito quante
 * ce ne sono e a che punto si è.
 */
export default function VenueEventsCard({
  group,
  locale,
  variant = "popup",
  onClose,
}: VenueEventsCardProps) {
  const dict = getDictionary(locale);
  const t = dict.events;
  const isSheet = variant === "sheet";

  const total = group.events.length;
  const [index, setIndex] = useState(0);

  // Cambiando locale selezionato, la scheda riparte dalla prima serata.
  useEffect(() => {
    setIndex(0);
  }, [group.key]);

  const last = Math.max(total - 1, 0);
  const safeIndex = Math.min(Math.max(index, 0), last);
  const current = group.events[safeIndex];

  const where = [group.venueName, group.city].filter(Boolean).join(" · ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${group.latitude},${group.longitude}`;
  const when = current
    ? formatEventDate(current.startsAt, current.timezone, locale)
    : null;

  const step = (delta: number) => {
    setIndex(Math.min(Math.max(safeIndex + delta, 0), last));
  };

  return (
    <article
      className={cn(
        "glass w-full border border-white/10 text-left",
        isSheet
          ? // Rete di sicurezza: il bottom sheet non può superare lo schermo.
            "max-h-[70vh] overflow-x-hidden overflow-y-auto rounded-3xl"
          : "overflow-hidden rounded-2xl"
      )}
    >
      {isSheet ? (
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted"
            >
              {dict.map.close}
            </button>
          ) : null}
        </div>
      ) : (
        <div
          className="h-1 w-full bg-gradient-to-r from-violet via-cyan to-pink"
          aria-hidden="true"
        />
      )}

      <div className="p-4">
        <h3 className="font-display text-base font-semibold leading-tight">
          {where || dict.map.title}
        </h3>
        <p className="mt-1 text-xs text-cyan">
          {total} {total === 1 ? dict.map.eventInProgram : dict.map.eventsInProgram}
        </p>

        {current ? (
          <div className="mt-3">
            <Link
              href={eventPath(current)}
              className="block rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/25"
            >
              <p className="text-xs text-white/80">
                {when?.isToday ? `${t.tonight} · ${when.time}` : when?.full}
              </p>
              <p className="mt-0.5 font-display text-sm font-semibold leading-tight">
                {current.title}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {[t.kinds[current.kind] ?? t.kinds.other, current.genre]
                  .filter(Boolean)
                  .join(" · ")}
                {current.isFree
                  ? ` · ${t.freeEntry}`
                  : current.priceText
                    ? ` · ${current.priceText}`
                    : ""}
              </p>
            </Link>

            {total > 1 ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={safeIndex === 0}
                  aria-label={t.previousEvent}
                  className={NAV_BUTTON}
                >
                  ‹
                </button>

                <span className="text-xs tabular-nums text-muted" aria-live="polite">
                  {safeIndex + 1} / {total}
                </span>

                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={safeIndex === last}
                  aria-label={t.nextEvent}
                  className={NAV_BUTTON}
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {current ? (
            <Link
              href={eventPath(current)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet to-cyan px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              {t.viewEvent}
            </Link>
          ) : null}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-white/30 hover:text-white"
          >
            {t.openInMaps}
          </a>
        </div>
      </div>
    </article>
  );
}
