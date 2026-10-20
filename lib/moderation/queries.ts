import { createClient } from "@/lib/supabase/server";

/**
 * Lettura della moderazione dopo la pubblicazione (B40).
 *
 * L'admin qui vede le serate **pubblicate** (che prima non aveva da nessuna
 * parte), quelle messe in pausa dalle segnalazioni e quante segnalazioni aperte
 * ha ognuna. Non è una classifica: è una coda da svuotare.
 */

export type ModerationEvent = {
  id: string;
  title: string;
  slug: string;
  city: string | null;
  status: "draft" | "published" | "cancelled";
  startsAt: string;
  /** Valorizzato = la serata è in pausa per le segnalazioni. */
  autoHiddenAt: string | null;
  reports: number;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerSuspendedAt: string | null;
};

type Row = {
  id: string;
  title: string;
  slug: string;
  city: string | null;
  status: "draft" | "published" | "cancelled";
  starts_at: string;
  auto_hidden_at: string | null;
  created_by: string | null;
  profiles:
    | { full_name: string | null; email: string | null; suspended_at: string | null }
    | { full_name: string | null; email: string | null; suspended_at: string | null }[]
    | null;
};

export async function listModerationEvents(limit = 120): Promise<ModerationEvent[]> {
  const supabase = await createClient();

  const [events, reports] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, slug, city, status, starts_at, auto_hidden_at, created_by, profiles!events_created_by_fkey ( full_name, email, suspended_at )"
      )
      .is("merged_into", null)
      .order("starts_at", { ascending: false })
      .limit(limit),
    supabase.from("reports").select("event_id").eq("status", "open"),
  ]);

  if (events.error) {
    console.error("[moderation] listModerationEvents:", events.error.message);
    return [];
  }

  if (reports.error) console.error("[moderation] reports:", reports.error.message);

  const counts = new Map<string, number>();
  for (const row of (reports.data ?? []) as Array<{ event_id: string }>) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  return (events.data as unknown as Row[]).map((row) => {
    const owner = Array.isArray(row.profiles) ? (row.profiles[0] ?? null) : row.profiles;

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      city: row.city,
      status: row.status,
      startsAt: row.starts_at,
      autoHiddenAt: row.auto_hidden_at,
      reports: counts.get(row.id) ?? 0,
      ownerId: row.created_by,
      ownerName: owner?.full_name ?? null,
      ownerEmail: owner?.email ?? null,
      ownerSuspendedAt: owner?.suspended_at ?? null,
    };
  });
}
