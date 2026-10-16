"use server";

import { createClient } from "@/lib/supabase/server";

export type ToggleSavedResult = {
  ok: boolean;
  /** Stato finale: true = evento salvato. */
  saved: boolean;
  /** true quando serve accedere per salvare. */
  requiresAuth?: boolean;
};

/**
 * Salva o rimuove un evento dai preferiti del profilo collegato.
 *
 * La RLS (`saved_events_*_own`) impedisce di scrivere righe di altri profili:
 * qui non serve nessun controllo aggiuntivo lato applicazione.
 */
export async function toggleSavedEvent(eventId: string): Promise<ToggleSavedResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, saved: false, requiresAuth: true };
  }

  const { data: existing, error: readError } = await supabase
    .from("saved_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (readError) {
    console.error("[saved] read:", readError.message);
    return { ok: false, saved: false };
  }

  if (existing) {
    const { error } = await supabase
      .from("saved_events")
      .delete()
      .eq("event_id", eventId)
      .eq("profile_id", user.id);

    if (error) {
      console.error("[saved] delete:", error.message);
      return { ok: false, saved: true };
    }

    return { ok: true, saved: false };
  }

  const { error } = await supabase
    .from("saved_events")
    .insert({ profile_id: user.id, event_id: eventId });

  if (error) {
    console.error("[saved] insert:", error.message);
    return { ok: false, saved: false };
  }

  return { ok: true, saved: true };
}
