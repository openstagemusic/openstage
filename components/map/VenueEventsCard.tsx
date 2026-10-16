"use client";

import Link from "next/link";

import { formatEventDate } from "@/lib/events/format";
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

/**
 * Scheda di un locale con più serate: il pin è uno solo, qui l'elenco delle
 * date con il link alla pagina di ogni evento. Serve perché un locale che
 * organizza più concerti è il caso normale, non l'eccezione.
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

  const where = [group.venueName, group.city].filter(Boolean).join(" · ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${group.latitude},${group.longitude}`;
  const count = group.events.length;

  return (
    <article
      className={cn(
        "glass w-full overflow-hidden border border-white/10 text-left",
        isSheet ? "rounded-3xl" : "rounded-2xl"
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
          {count} {count === 1 ? dict.map.eventInProgram : dict.map.eventsInProgram}
        </p>

        <ul className="mt-3 space-y-2">
          {group.events.map((event) => {
            const when = formatEventDate(event.startsAt, event.timezone, locale);
            const kindLabel = t.kinds[event.kind] ?? t.kinds.other;
            const meta = [kindLabel, event.genre].filter(Boolean).join(" · ");

            return (
              <li key={event.id}>
                <Link
                  href={`/eventi/${event.id}`}
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/25"
                >
                  <p className="text-xs text-white/80">
                    {when.isToday ? `${t.tonight} · ${when.time}` : when.full}
                  </p>
                  <p className="mt-0.5 font-display text-sm font-semibold leading-tight">
                    {event.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {meta}
                    {event.isFree ? ` · ${t.freeEntry}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
