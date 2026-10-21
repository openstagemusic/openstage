import Link from "@/components/i18n/LocaleLink";

import type { Dictionary } from "@/i18n/dictionaries/en";
import { formatEventDate } from "@/lib/events/format";
import { eventPath } from "@/lib/events/paths";
import { placeName, type PublicEvent } from "@/lib/events/types";
import type { Locale } from "@/lib/i18n/config";

type EventRowsProps = {
  events: PublicEvent[];
  locale: Locale;
  dict: Dictionary;
};

function dateParts(event: PublicEvent, locale: Locale) {
  const date = new Date(event.startsAt);
  const zone = event.timezone || "Europe/Rome";

  return {
    day: new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      timeZone: zone,
    }).format(date),
    month: new Intl.DateTimeFormat(locale, {
      month: "short",
      timeZone: zone,
    })
      .format(date)
      .replace(/\.$/, ""),
  };
}

/**
 * La lista delle serate in Home: righe, non schede.
 *
 * Data grande, titolo, luogo/genere e ingresso. Tutto il testo utile sta nel
 * link, quindi la riga si legge e si tocca tutta; il numero del giorno è
 * decorativo perché la data completa è già nella riga dell'orario.
 */
export default function EventRows({ events, locale, dict }: EventRowsProps) {
  return (
    <ul className="border-t border-line">
      {events.map((event) => {
        const when = formatEventDate(event.startsAt, event.timezone, locale);
        const { day, month } = dateParts(event, locale);
        const where = [placeName(event), event.city].filter(Boolean).join(" · ");
        const meta = [dict.events.kinds[event.kind] ?? dict.events.kinds.other, where, event.genre]
          .filter(Boolean)
          .join(" · ");
        const entry = event.isFree ? dict.events.freeEntry : (event.priceText ?? dict.showcase.paid);
        const relativeDay = when.isToday
          ? dict.events.tonight
          : when.isTomorrow
            ? dict.events.tomorrow
            : null;

        return (
          <li key={event.id}>
            <Link href={eventPath(event)} className="home-event-row group">
              <span className="row-date" aria-hidden="true">
                <span className="row-day">{day}</span>
                <span className="row-month">{month}</span>
              </span>

              <span className="min-w-0">
                <span className="row-title">{event.title}</span>
                {meta ? <span className="row-meta">{meta}</span> : null}
                <span className="row-when">
                  {!relativeDay ? <span className="sr-only">{when.date} </span> : null}
                  {relativeDay ? <strong>{relativeDay} · </strong> : null}
                  {when.time} · {entry}
                </span>
              </span>

              <span className="row-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
