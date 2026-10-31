import EventCover from "@/components/events/EventCover";
import Link from "@/components/i18n/LocaleLink";

import type { Dictionary } from "@/i18n/dictionaries/en";
import { formatEventDate } from "@/lib/events/format";
import { eventPath } from "@/lib/events/paths";
import { artistRepeatsTitle, isCancelled, placeName, type PublicEvent } from "@/lib/events/types";
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

  // Negli elenchi pubblici un annullato non c'è; qui resta solo il caso dei
  // **Preferiti**, dove chi l'aveva salvato deve vedere che non si tiene.
  const cancelled = isCancelled(event);

  return (
    <article className="group h-full border-t border-line pt-4 transition-colors">
      <Link
        href={eventPath(event)}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
      >
        <EventCover
          src={event.coverImageUrl}
          className="aspect-square w-full transition-transform duration-500 ease-out-expo motion-safe:group-hover:scale-[1.02]"
        />

        <div className="flex flex-1 flex-col p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {cancelled ? (
              <span className="border border-pink/40 bg-pink/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                {dict.events.cancelledBadge}
              </span>
            ) : (
              <span className="border border-violet/40 bg-violet/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                {kindLabel}
              </span>
            )}
            {whenLabel ? (
              <span className="border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                {whenLabel}
              </span>
            ) : null}
            {event.isFree || event.priceText ? (
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {event.isFree ? dict.events.freeEntry : event.priceText}
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 font-display text-lg font-semibold leading-tight">{event.title}</h3>

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
