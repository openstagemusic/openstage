import Link from "@/components/i18n/LocaleLink";

import type { Dictionary } from "@/i18n/dictionaries/en";
import { formatEventDate } from "@/lib/events/format";
import { eventPath } from "@/lib/events/paths";
import { artistRepeatsTitle, type PublicEvent } from "@/lib/events/types";
import type { Locale } from "@/lib/i18n/config";

type EventTableProps = {
  events: PublicEvent[];
  locale: Locale;
  dict: Dictionary;
};

/**
 * Vista tabella dell'elenco eventi.
 *
 * Renderizzata dal server come le schede: stesso contenuto, stessa
 * indicizzabilità. Le colonne meno importanti si nascondono sugli schermi
 * stretti e la tabella scorre in orizzontale quando serve.
 */
export default function EventTable({ events, locale, dict }: EventTableProps) {
  const columns = dict.showcase.columns;

  return (
    <div className="glass mt-6 overflow-x-auto rounded-3xl border border-white/10">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm sm:min-w-[720px]">
        <caption className="sr-only">{dict.showcase.viewTable}</caption>

        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="px-4 py-3 font-medium">
              {columns.date}
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              {columns.event}
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
              {columns.artist}
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
              {columns.venue}
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
              {columns.genre}
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
              {columns.kind}
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
              {columns.entry}
            </th>
          </tr>
        </thead>

        <tbody>
          {events.map((event) => {
            const when = formatEventDate(event.startsAt, event.timezone, locale);
            const where = [event.venue?.name, event.city].filter(Boolean).join(" · ");
            const artist = event.artist && !artistRepeatsTitle(event) ? event.artist.name : "—";

            return (
              <tr
                key={event.id}
                className="border-t border-white/5 transition-colors hover:bg-white/5"
              >
                <td className="whitespace-nowrap px-4 py-3 text-white/80">{when.full}</td>

                <td className="px-4 py-3">
                  <Link href={eventPath(event)} className="font-medium hover:text-cyan">
                    {event.title}
                  </Link>
                  {/* Su schermo stretto locale e città stanno sotto il titolo. */}
                  {where ? (
                    <span className="mt-0.5 block text-xs text-muted sm:hidden">{where}</span>
                  ) : null}
                </td>

                <td className="hidden px-4 py-3 text-white/80 md:table-cell">{artist}</td>
                <td className="hidden px-4 py-3 text-white/80 sm:table-cell">{where || "—"}</td>
                <td className="hidden px-4 py-3 text-muted lg:table-cell">
                  {event.genre ?? "—"}
                </td>
                <td className="hidden px-4 py-3 text-muted lg:table-cell">
                  {dict.events.kinds[event.kind] ?? dict.events.kinds.other}
                </td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">
                  {event.isFree ? dict.events.freeEntry : dict.showcase.paid}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
