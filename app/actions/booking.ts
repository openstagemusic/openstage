"use server";

import { revalidatePath } from "next/cache";

import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { getBookingTarget } from "@/lib/booking/queries";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

export type BookingActionResult = {
  ok: boolean;
  threadId?: string;
  error?: "auth" | "role" | "invalid" | "self" | "unavailable" | "failed";
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validDate(value: string): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/**
 * Apre una richiesta di booking. Il contatto è gratuito e disponibile solo tra
 * artista e locale, mai verso la propria scheda.
 */
export async function startBookingThreadAction(input: {
  targetType: "artist" | "venue";
  targetId: string;
  eventDate?: string;
  feeText?: string;
  body: string;
}): Promise<BookingActionResult> {
  const session = await getSessionProfile();
  if (!session) return { ok: false, error: "auth" };
  if (session.role !== "artist" && session.role !== "venue") {
    return { ok: false, error: "role" };
  }

  const targetType = input.targetType === "artist" ? "artist" : "venue";
  if ((session.role === "artist" && targetType !== "venue") || (session.role === "venue" && targetType !== "artist")) {
    return { ok: false, error: "role" };
  }

  const targetId = input.targetId.trim();
  const body = clean(input.body, 2000);
  const feeText = clean(input.feeText, 80) || null;
  const eventDate = validDate(clean(input.eventDate, 10));

  if (!targetId || body.length < 10) return { ok: false, error: "invalid" };

  const [page, target] = await Promise.all([
    session.role === "artist" ? getArtistByProfileId(session.id) : getVenueByProfileId(session.id),
    getBookingTarget(targetType, targetId),
  ]);

  if (!page || !target || !target.profileId) return { ok: false, error: "unavailable" };
  if (target.profileId === session.id) return { ok: false, error: "self" };

  const artistId = session.role === "artist" ? page.id : target.id;
  const venueId = session.role === "venue" ? page.id : target.id;
  const artistName = session.role === "artist" ? page.name : target.name;
  const venueName = session.role === "venue" ? page.name : target.name;

  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent, error: recentError } = await supabase
    .from("booking_threads")
    .select("id")
    .eq("artist_id", artistId)
    .eq("venue_id", venueId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentError) {
    console.error("[booking] recent thread:", recentError.message);
    return { ok: false, error: "failed" };
  }

  // Stessa coppia, stesso giorno: si continua la conversazione invece di
  // aprire un doppione.
  if (recent) return { ok: true, threadId: recent.id };

  const { data: thread, error: threadError } = await supabase
    .from("booking_threads")
    .insert({
      artist_id: artistId,
      venue_id: venueId,
      created_by: session.id,
      subject: `${artistName} × ${venueName}`,
      event_date: eventDate,
      fee_text: feeText,
    })
    .select("id")
    .single();

  if (threadError || !thread) {
    console.error("[booking] create thread:", threadError?.message);
    return { ok: false, error: "failed" };
  }

  const { error: messageError } = await supabase.from("booking_messages").insert({
    thread_id: thread.id,
    sender_id: session.id,
    body,
  });

  if (messageError) {
    console.error("[booking] first message:", messageError.message);
    await supabase.from("booking_threads").delete().eq("id", thread.id);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/dashboard/messaggi");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/messaggi/${thread.id}`);
  return { ok: true, threadId: thread.id };
}

/** Risposta in un thread esistente; la RLS limita ai partecipanti. */
export async function sendBookingMessageAction(input: {
  threadId: string;
  body: string;
}): Promise<BookingActionResult> {
  const session = await getSessionProfile();
  if (!session) return { ok: false, error: "auth" };

  const threadId = input.threadId.trim();
  const body = clean(input.body, 2000);
  if (!threadId || body.length < 1) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.from("booking_messages").insert({
    thread_id: threadId,
    sender_id: session.id,
    body,
  });

  if (error) {
    console.error("[booking] reply:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath(`/dashboard/messaggi/${threadId}`);
  revalidatePath("/dashboard/messaggi");
  revalidatePath("/dashboard/notifiche");
  return { ok: true, threadId };
}
