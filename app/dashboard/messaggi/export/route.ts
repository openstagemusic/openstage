import { listBookingThreads } from "@/lib/booking/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Export delle richieste di contatto e booking.
 *
 * Le proprie conversazioni con stato, data proposta, cachet e promemoria: serve
 * a chi tiene la programmazione anche in un foglio. Nessun messaggio e nessuna
 * nota privata escono da qui.
 */

function cell(value: string | null | undefined): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await getSessionProfile();

  if (!session || (session.role !== "artist" && session.role !== "venue")) {
    return new Response("Non autorizzato", { status: 401 });
  }

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.booking;
  const threads = await listBookingThreads(session.id, session.role);

  const statusLabel = {
    new: t.statusNew,
    open: t.statusOpen,
    confirmed: t.statusConfirmed,
    declined: t.statusDeclined,
    archived: t.statusArchived,
  } as const;

  const lines: string[] = [
    ["controparte", "tipo", "oggetto", "data_proposta", "cachet", "stato", "promemoria", "ultimo_messaggio"]
      .map(cell)
      .join(","),
  ];

  for (const thread of threads) {
    lines.push(
      [
        cell(thread.counterpartName),
        cell(thread.counterpartType),
        cell(thread.subject),
        cell(thread.eventDate),
        cell(thread.feeText),
        cell(statusLabel[thread.status]),
        cell(thread.reminderAt),
        cell(thread.lastMessageAt.slice(0, 10)),
      ].join(",")
    );
  }

  const body = `\uFEFF${lines.join("\r\n")}\r\n`;

  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="openstage-booking.csv"',
      "cache-control": "no-store",
    },
  });
}
