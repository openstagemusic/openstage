"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type EventActionResult = { ok: boolean; error: string | null };

function result(error: { message: string } | null): EventActionResult {
  if (error) {
    console.error("[events]", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

/**
 * Pubblica o annulla un evento.
 *
 * Qui non ci sono scorciatoie: il database rifà tutti i controlli. Chi non è
 * ancora verificato resta in bozza (`events_require_review`) e chi non è il
 * proprietario dell'evento non passa la policy, qualunque cosa arrivi da qui.
 */
export async function setEventStatusAction(input: {
  eventId: string;
  status: "published" | "cancelled";
}): Promise<EventActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({ status: input.status })
    .eq("id", input.eventId);

  revalidatePath("/dashboard");

  return result(error);
}

/** Elimina una bozza. Un evento pubblicato si annulla, non si elimina. */
export async function deleteDraftAction(input: { eventId: string }): Promise<EventActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", input.eventId)
    .eq("status", "draft");

  revalidatePath("/dashboard");

  return result(error);
}
