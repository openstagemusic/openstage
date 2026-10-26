import { NextResponse, type NextRequest } from "next/server";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Export CSV/JSON del registro email o della coda.
 *
 * Solo admin, massimo 5000 righe, nessun corpo email: destinatario, soggetto,
 * categoria, stato, tentativi e date. Nessun tracciamento.
 */
export async function GET(request: NextRequest) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const scope = request.nextUrl.searchParams.get("scope") === "queue" ? "queue" : "log";
  const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";
  const supabase = await createClient();

  const query =
    scope === "queue"
      ? supabase
          .from("email_queue")
          .select(
            "id, to_email, subject, category, status, attempts, max_attempts, last_error, batch_id, recipient_count, created_at, sent_at"
          )
          .order("created_at", { ascending: false })
          .limit(5000)
      : supabase
          .from("email_log")
          .select(
            "id, to_email, subject, category, status, provider_id, error, batch_id, recipient_count, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(5000);

  const { data, error } = await query;

  if (error) {
    console.error("[email-export]", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const filename = `openstage-email-${scope}-${new Date().toISOString().slice(0, 10)}.${format}`;

  if (format === "json") {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const columns = Object.keys(rows[0] ?? {});
  const escape = (value: unknown) => {
    const text = value == null ? "" : String(value);
    return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(",")),
  ].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
