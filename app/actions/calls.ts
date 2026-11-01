"use server";

import { revalidatePath } from "next/cache";

import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Bacheca ingaggi: pubblicazione, tetto candidature, chiusura, candidatura.
 *
 * Le regole vere stanno anche nel database (RLS + trigger sul tetto): qui si
 * valida quello che arriva dal modulo e si traducono gli errori in codici.
 */

export type CallActionResult = {
  ok: boolean;
  callId?: string;
  error?:
    | "auth"
    | "role"
    | "page"
    | "verified"
    | "invalid"
    | "alreadyOpen"
    | "closed"
    | "full"
    | "duplicate"
    | "self"
    | "failed";
};

const ROLES = new Set(["artist", "band", "dj", "performer", "technician", "other"]);
const COMPENSATIONS = new Set(["paid", "door_split", "unpaid", "tbd"]);

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function dateOrNull(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function refreshCalls(callId?: string) {
  revalidatePath("/calls");
  revalidatePath("/dashboard/chiamate");
  revalidatePath("/dashboard");
  if (callId) revalidatePath(`/calls/${callId}`);
}

export async function createCallAction(formData: FormData): Promise<CallActionResult> {
  const session = await getSessionProfile();
  if (!session) return { ok: false, error: "auth" };
  // La bacheca è dei locali: un artista non pubblica chiamate.
  if (session.role !== "venue" && session.role !== "admin") {
    return { ok: false, error: "role" };
  }
  if (!session.verified) return { ok: false, error: "verified" };

  const venue = session.role === "venue" ? await getVenueByProfileId(session.id) : null;

  const page = venue;
  if (!page) return { ok: false, error: "page" };
  if (venue?.closedAt) return { ok: false, error: "closed" };

  const title = clean(formData.get("title"), 120);
  const body = clean(formData.get("body"), 2000);
  const roleWanted = clean(formData.get("roleWanted"), 20);
  const compensation = clean(formData.get("compensation"), 20);
  const feeText = clean(formData.get("feeText"), 120) || null;
  const city = clean(formData.get("city"), 80) || null;
  const periodStart = dateOrNull(formData.get("periodStart"));
  const periodEnd = dateOrNull(formData.get("periodEnd"));
  const maxRaw = Number.parseInt(String(formData.get("maxApplications") ?? ""), 10);
  const daysRaw = Number.parseInt(String(formData.get("expiresInDays") ?? ""), 10);

  if (title.length < 4 || body.length < 30) return { ok: false, error: "invalid" };
  if (!ROLES.has(roleWanted) || !COMPENSATIONS.has(compensation)) {
    return { ok: false, error: "invalid" };
  }
  // Chi non paga deve dirlo: «da definire» non è una scusa.
  if (compensation === "paid" && !feeText) return { ok: false, error: "invalid" };
  if (periodStart && periodEnd && periodEnd < periodStart) return { ok: false, error: "invalid" };

  const maxApplications = Number.isFinite(maxRaw) ? Math.min(50, Math.max(1, maxRaw)) : 10;
  const days = Number.isFinite(daysRaw) ? Math.min(60, Math.max(7, daysRaw)) : 30;
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();

  const supabase = await createClient();

  // Una chiamata scaduta non blocca la successiva: prima si chiude.
  await supabase
    .from("calls")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("created_by", session.id)
    .eq("status", "open")
    .lte("expires_at", new Date().toISOString());

  const { data: existing } = await supabase
    .from("calls")
    .select("id")
    .eq("created_by", session.id)
    .eq("status", "open")
    .maybeSingle();

  if (existing) return { ok: false, error: "alreadyOpen" };

  const { data, error } = await supabase
    .from("calls")
    .insert({
      created_by: session.id,
      venue_id: venue?.id ?? null,
      // La bacheca è dei locali: la scheda artista resta vuota.
      artist_id: null,
      title,
      body,
      role_wanted: roleWanted,
      city: city ?? page.city ?? null,
      period_start: periodStart,
      period_end: periodEnd,
      fee_text: feeText,
      compensation,
      max_applications: maxApplications,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[calls] create:", error?.message);
    return { ok: false, error: "failed" };
  }

  refreshCalls(data.id);
  return { ok: true, callId: data.id };
}

/** Il tetto si può alzare (o abbassare) mentre la chiamata è aperta. */
export async function updateCallCapacityAction(formData: FormData): Promise<void> {
  const session = await getSessionProfile();
  if (!session) return;

  const callId = String(formData.get("callId") ?? "").trim();
  const maxRaw = Number.parseInt(String(formData.get("maxApplications") ?? ""), 10);
  if (!callId || !Number.isFinite(maxRaw)) return;

  const max = Math.min(50, Math.max(1, maxRaw));
  const supabase = await createClient();
  const { error } = await supabase
    .from("calls")
    .update({ max_applications: max })
    .eq("id", callId)
    .eq("created_by", session.id);

  if (error) {
    console.error("[calls] capacity:", error.message);
    return;
  }

  refreshCalls(callId);
}

/** Chiusura anticipata: trovata la persona, l'annuncio sparisce. */
export async function closeCallAction(formData: FormData): Promise<void> {
  const session = await getSessionProfile();
  if (!session) return;

  const callId = String(formData.get("callId") ?? "").trim();
  if (!callId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("calls")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", callId)
    .eq("created_by", session.id);

  if (error) {
    console.error("[calls] close:", error.message);
    return;
  }

  refreshCalls(callId);
}

/**
 * Candidatura: apre un thread di booking collegato alla chiamata.
 *
 * Il tetto e la scadenza sono controllati dal trigger `enforce_call_capacity`,
 * quindi due candidature nello stesso istante non possono superarli.
 */
export async function applyToCallAction(formData: FormData): Promise<CallActionResult> {
  const session = await getSessionProfile();
  if (!session) return { ok: false, error: "auth" };
  if (session.role !== "artist" && session.role !== "venue") {
    return { ok: false, error: "role" };
  }

  const callId = String(formData.get("callId") ?? "").trim();
  const body = clean(formData.get("body"), 2000);
  if (!callId || body.length < 10) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { data: call, error: callError } = await supabase
    .from("calls")
    .select("id, created_by, venue_id, artist_id, title, fee_text, period_start, status, expires_at")
    .eq("id", callId)
    .maybeSingle();

  if (callError || !call) return { ok: false, error: "closed" };
  if (call.created_by === session.id) return { ok: false, error: "self" };
  if (call.status !== "open" || new Date(call.expires_at) <= new Date()) {
    return { ok: false, error: "closed" };
  }

  const [artist, venue] = await Promise.all([
    getArtistByProfileId(session.id),
    getVenueByProfileId(session.id),
  ]);

  const applicantType = artist ? "artist" : venue ? "venue" : null;
  if (!applicantType) return { ok: false, error: "page" };

  // Chi pubblica come locale cerca artisti, e viceversa.
  const ownerType = call.venue_id ? "venue" : "artist";
  if (ownerType === applicantType) return { ok: false, error: "role" };

  const artistId = applicantType === "artist" ? artist!.id : call.artist_id;
  const venueId = applicantType === "venue" ? venue!.id : call.venue_id;

  if (!artistId || !venueId) return { ok: false, error: "failed" };

  const { data: thread, error: threadError } = await supabase
    .from("booking_threads")
    .insert({
      artist_id: artistId,
      venue_id: venueId,
      created_by: session.id,
      call_id: callId,
      subject: call.title,
      event_date: call.period_start,
      fee_text: call.fee_text,
    })
    .select("id")
    .single();

  if (threadError || !thread) {
    const message = threadError?.message ?? "";
    if (message.includes("call_full")) return { ok: false, error: "full" };
    if (message.includes("call_closed")) return { ok: false, error: "closed" };
    if (threadError?.code === "23505") return { ok: false, error: "duplicate" };
    console.error("[calls] apply:", message);
    return { ok: false, error: "failed" };
  }

  const { error: messageError } = await supabase.from("booking_messages").insert({
    thread_id: thread.id,
    sender_id: session.id,
    body,
  });

  if (messageError) {
    console.error("[calls] apply message:", messageError.message);
    await supabase.from("booking_threads").delete().eq("id", thread.id);
    return { ok: false, error: "failed" };
  }

  refreshCalls(callId);
  revalidatePath("/dashboard/messaggi");
  return { ok: true, callId };
}
