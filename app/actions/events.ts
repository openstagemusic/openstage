"use server";

import { revalidatePath } from "next/cache";

import { canManageEvents } from "@/lib/auth/roles";
import { getArtistByProfileId } from "@/lib/directory/queries";
import {
  validateEventInput,
  type EditorErrors,
  type EventEditorState,
} from "@/lib/events/editor";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

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

export type SaveEventResult = {
  ok: boolean;
  eventId?: string;
  /** Lo stato **reale** dopo il salvataggio: il database può aver corretto il tiro. */
  status?: "draft" | "published" | "cancelled";
  fieldErrors?: EditorErrors;
  /** Codice da tradurre con i dizionari (mai il messaggio grezzo del database). */
  error?: "unauthorized" | "notFound" | "saveFailed";
};

/**
 * Crea o aggiorna un evento.
 *
 * Il modulo manda solo i campi che l'utente può scegliere: chi scrive l'evento
 * (`created_by`) e l'artista della serata (`artist_id`) li decide il server, così
 * nessuno può attribuire un concerto a un altro. Le regole di validità stanno in
 * `lib/events/editor.ts`, le autorizzazioni nella RLS: qui si mettono insieme.
 */
export async function saveEventAction(input: {
  eventId: string | null;
  status: "draft" | "published" | "cancelled";
  values: EventEditorState;
}): Promise<SaveEventResult> {
  const session = await getSessionProfile();

  if (!session || !canManageEvents(session.role)) {
    return { ok: false, error: "unauthorized" };
  }

  const validated = validateEventInput(input.values);

  if (!validated.ok) {
    return { ok: false, fieldErrors: validated.errors };
  }

  const supabase = await createClient();
  const values = validated.values;

  const payload = {
    title: values.title,
    kind: values.kind,
    genre: values.genre,
    description: values.description,
    starts_at: values.startsAt,
    timezone: values.timezone,
    venue_id: values.venueId,
    venue_name: values.venueName,
    city: values.city,
    latitude: values.latitude,
    longitude: values.longitude,
    location_precision: values.locationPrecision,
    area_radius_m: values.areaRadiusM,
    is_free: values.isFree,
    price_text: values.priceText,
    ticket_url: values.ticketUrl,
    status: input.status,
  };

  if (input.eventId) {
    const { data, error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", input.eventId)
      .select("id, status")
      .maybeSingle();

    if (error) {
      console.error("[events] saveEventAction (modifica):", error.message);
      return { ok: false, error: "saveFailed" };
    }

    if (!data) return { ok: false, error: "notFound" };

    revalidatePath("/dashboard");

    return { ok: true, eventId: data.id, status: data.status as SaveEventResult["status"] };
  }

  // L'artista della serata è chi la crea: non si sceglie dal modulo.
  const artist = await getArtistByProfileId(session.id);

  const { data, error } = await supabase
    .from("events")
    .insert({ ...payload, created_by: session.id, artist_id: artist?.id ?? null })
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error("[events] saveEventAction (creazione):", error.message);
    return { ok: false, error: "saveFailed" };
  }

  if (!data) return { ok: false, error: "saveFailed" };

  revalidatePath("/dashboard");

  return { ok: true, eventId: data.id, status: data.status as SaveEventResult["status"] };
}
