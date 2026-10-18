import Link from "@/components/i18n/LocaleLink";

import type { Dictionary } from "@/i18n/dictionaries/en";
import { formatEventDate } from "@/lib/events/format";
import { eventPath } from "@/lib/events/paths";
import { artistRepeatsTitle, placeName, type PublicEvent } from "@/lib/events/types";
import type { Locale } from "@/lib/i18n/config";

type EventTeaserProps = {
  event: PublicEvent;
  locale: Locale;
  dict: Dictionary;
};

/**
 * Scheda evento degli elenchi (renderizzata dal server: contenuto indicizzabile
 * e leggibile anche senza JavaScript).
 */
export default function EventTeaser({ event, locale, dict }: EventTeaserProps) {
  const when = formatEventDate(event.startsAt, event.timezone, locale);
  const where = [placeName(event), event.city].filter(Boolean).join(" · ");
  const kindLabel = dict.events.kinds[event.kind] ?? dict.events.kinds.other;
  const whenLabel = when.isToday ? dict.events.tonight : when.isTomorrow ? dict.events.tomorrow : null;

  return (
    <article className="glass h-full overflow-hidden rounded-3xl border border-white/10 transition-colors hover:border-white/25">
      <Link href={eventPath(event)} className="flex h-full flex-col">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- locandine da URL esterni arbitrari
          <img
            src={event.coverImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-36 w-full object-cover"
          />
        ) : (
          <div
            className="h-1.5 w-full bg-gradient-to-r from-violet via-cyan to-pink"
            aria-hidden="true"
          />
        )}

        <div className="flex flex-1 flex-col p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 text-white">
              {kindLabel}
            </span>
            {whenLabel ? (
              <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-white">
                {whenLabel}
              </span>
            ) : null}
            {event.isFree || event.priceText ? (
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-muted">
                {event.isFree ? dict.events.freeEntry : event.priceText}
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 font-display text-base font-semibold leading-tight">{event.title}</h3>

          {event.artist && !artistRepeatsTitle(event) ? (
            <p className="mt-1 text-sm text-white/80">{event.artist.name}</p>
          ) : null}

          <p className="mt-auto pt-3 text-sm text-muted">
            <span className="text-white/80">{when.full}</span>
            {where ? ` · ${where}` : ""}
          </p>
        </div>
      </Link>
    </article>
  );
}
