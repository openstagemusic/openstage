import { canManageEvents } from "@/lib/auth/roles";
import { listMyEvents } from "@/lib/dashboard/queries";
import { eventPath } from "@/lib/events/paths";
import { placeName } from "@/lib/events/types";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Export della programmazione.
 *
 * Un CSV con le proprie serate: titolo, data, ora, luogo, stato, prezzo e link
 * pubblico. Serve a chi tiene la programmazione anche altrove (un foglio, un
 * calendario, il sito del locale). Nessun dato di altre persone.
 */

function cell(value: string | number | null | undefined): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await getSessionProfile();

  if (!session || !canManageEvents(session.role)) {
    return new Response("Non autorizzato", { status: 401 });
  }

  const [events, locale] = await Promise.all([listMyEvents(session.id), getLocale()]);

  const lines: string[] = [
    ["titolo", "data", "ora", "citta", "locale", "stato", "prezzo", "link"]
      .map(cell)
      .join(","),
  ];

  for (const event of events) {
    const date = new Date(event.startsAt);
    const day = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: event.timezone || "Europe/Rome",
    }).format(date);
    const time = new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: event.timezone || "Europe/Rome",
    }).format(date);

    lines.push(
      [
        cell(event.title),
        cell(day),
        cell(time),
        cell(event.city),
        cell(placeName(event)),
        cell(event.status),
        cell(event.isFree ? "Ingresso gratuito" : event.priceText),
        cell(absoluteUrl(withLocale(locale, eventPath(event)))),
      ].join(",")
    );
  }

  const body = `\uFEFF${lines.join("\r\n")}\r\n`;

  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="openstage-programmazione.csv"',
      "cache-control": "no-store",
    },
  });
}
