"use server";

import { revalidatePath } from "next/cache";

import { getVenueByProfileId } from "@/lib/directory/queries";
import { CANCEL_REASON_MAX } from "@/lib/events/editor";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Chiusura e riapertura di un locale.
 *
 * Chiudere non cancella niente: la scheda resta, le serate passate restano come
 * archivio, e quelle future vengono **annullate** con il motivo. Il trigger
 * `notify_event_cancelled` avvisa già chi le aveva salvate o seguiva il locale.
 *
 * Riaprire è sempre possibile: si toglie la data di chiusura, le serate
 * annullate si possono rimettere in programma a mano.
 */

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function refresh() {
  revalidatePath("/", "layout");
  revalidatePath("/locali");
  revalidatePath("/mappa");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");
  revalidatePath("/account");
}

export async function closeVenueAction(formData: FormData): Promise<void> {
  const session = await getSessionProfile();
  if (!session || session.role !== "venue") return;

  const venue = await getVenueByProfileId(session.id);
  if (!venue) return;

  const note = clean(formData.get("note"), 280) || null;
  const reason = (note ? `Locale chiuso — ${note}` : "Locale chiuso").slice(0, CANCEL_REASON_MAX);
  const supabase = await createClient();

  const { error } = await supabase
    .from("venues")
    .update({ closed_at: new Date().toISOString(), closed_note: note })
    .eq("id", venue.id);

  if (error) {
    console.error("[venue] close:", error.message);
    return;
  }

  // Le serate in programma non si fanno più: si annullano, non si cancellano.
  const { error: eventsError } = await supabase
    .from("events")
    .update({ status: "cancelled", cancel_reason: reason })
    .eq("venue_id", venue.id)
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString());

  if (eventsError) {
    console.error("[venue] close events:", eventsError.message);
  }

  refresh();
}

export async function reopenVenueAction(): Promise<void> {
  const session = await getSessionProfile();
  if (!session || session.role !== "venue") return;

  const venue = await getVenueByProfileId(session.id);
  if (!venue) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("venues")
    .update({ closed_at: null, closed_note: null })
    .eq("id", venue.id);

  if (error) {
    console.error("[venue] reopen:", error.message);
    return;
  }

  refresh();
}
