import { getProfileAnalytics, type AnalyticsRange } from "@/lib/analytics/queries";
import { canManageEvents } from "@/lib/auth/roles";
import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Export CSV delle statistiche.
 *
 * Stesse regole della pagina: solo i propri eventi, solo numeri aggregati.
 * Il foglio si apre in Excel con l'accento corretto grazie al BOM.
 */

function cell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await getSessionProfile();

  if (!session || !canManageEvents(session.role)) {
    return new Response("Non autorizzato", { status: 401 });
  }

  const url = new URL(request.url);
  const days: AnalyticsRange = url.searchParams.get("range") === "90" ? 90 : 30;

  const [artistPage, venuePage] = await Promise.all([
    session.role === "artist" ? getArtistByProfileId(session.id) : Promise.resolve(null),
    session.role === "venue" ? getVenueByProfileId(session.id) : Promise.resolve(null),
  ]);

  const page = artistPage ?? venuePage;

  if (!page) return new Response("Nessuna scheda", { status: 404 });

  const analytics = await getProfileAnalytics({
    profileId: session.id,
    role: artistPage ? "artist" : "venue",
    pageId: page.id,
    days,
  });

  const lines: string[] = [
    ["serata", "data", "stato", "visite", "salvataggi"].map(cell).join(","),
  ];

  for (const event of analytics.events) {
    lines.push(
      [
        cell(event.title),
        cell(event.startsAt.slice(0, 10)),
        cell(event.status),
        cell(event.views),
        cell(event.saves),
      ].join(",")
    );
  }

  const body = `\uFEFF${lines.join("\r\n")}\r\n`;

  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="openstage-statistiche-${days}g.csv"`,
      "cache-control": "no-store",
    },
  });
}
