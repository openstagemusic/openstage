"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { fetchPublicText } from "@/lib/ai/fetch-public";
import { parseEventFromText } from "@/lib/ai/tasks/parse-event";
import { ParsedEventSchema, type ParsedEvent } from "@/lib/ai/schemas";
import { FILTER_TIMEZONE, zonedInstant } from "@/lib/events/timezone";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

export type AnalyzeEventResult =
  | { ok: true; data: ParsedEvent }
  | {
      ok: false;
      error: "unauthorized" | "invalid" | "fetch_failed" | "not_configured" | "budget" | "failed";
    };

/** Analizza testo o URL pubblico. Nessuna scrittura sul database. */
export async function analyzeEventAction(input: {
  text: string;
  url?: string;
}): Promise<AnalyzeEventResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const pasted = input.text.trim();
  const url = input.url?.trim() ?? "";
  let fetched = "";

  if (url) {
    try {
      fetched = await fetchPublicText(url);
    } catch (error) {
      console.error("[ai] fetch-public:", error instanceof Error ? error.message : error);
      return { ok: false, error: "fetch_failed" };
    }
  }

  const text = [fetched, pasted].filter(Boolean).join("\n\n").slice(0, 8000);

  if (text.length < 30) return { ok: false, error: "invalid" };

  const parsed = await parseEventFromText({
    text,
    sourceUrl: url || null,
  });

  if (!parsed.ok) return { ok: false, error: parsed.error };

  return { ok: true, data: parsed.data };
}

export type CreateImportedEventResult =
  | { ok: true; eventId: string }
  | { ok: false; error: "unauthorized" | "invalid" | "failed" };

function validHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Salva l'anteprima come bozza: l'admin completa l'editor prima di pubblicare. */
export async function createImportedEventAction(
  input: ParsedEvent
): Promise<CreateImportedEventResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const parsed = ParsedEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const data = parsed.data;

  if (!data.date || !data.time) return { ok: false, error: "invalid" };

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(data.time);

  if (!dateMatch || !timeMatch) return { ok: false, error: "invalid" };

  const instant = zonedInstant(
    {
      year: Number(dateMatch[1]),
      month: Number(dateMatch[2]),
      day: Number(dateMatch[3]),
      hour: Number(timeMatch[1]),
      minute: Number(timeMatch[2]),
    },
    FILTER_TIMEZONE
  );

  if (!Number.isFinite(instant.getTime())) return { ok: false, error: "invalid" };

  const session = await getSessionProfile();
  if (!session) return { ok: false, error: "unauthorized" };

  const descriptionParts = [
    data.artist ? `Artista: ${data.artist}` : null,
    data.address ? `Indirizzo: ${data.address}` : null,
    data.description,
  ].filter(Boolean);

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      title: data.title,
      description: descriptionParts.join("\n\n").slice(0, 4000),
      genre: data.genre,
      starts_at: instant.toISOString(),
      timezone: FILTER_TIMEZONE,
      city: data.city,
      venue_name: data.venue,
      directions_text: data.address,
      price_text: data.priceText,
      ticket_url: validHttpUrl(data.ticketUrl ?? null),
      status: "draft",
      created_by: session.id,
    })
    .select("id")
    .single();

  if (error || !event) {
    console.error("[ai] createImportedEvent:", error?.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/eventi");
  revalidatePath("/admin/bozze");
  revalidatePath("/dashboard/events");

  return { ok: true, eventId: event.id };
}
