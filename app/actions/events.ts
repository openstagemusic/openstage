"use server";

import { revalidatePath } from "next/cache";

import { canManageEvents } from "@/lib/auth/roles";
import { getArtistByProfileId } from "@/lib/directory/queries";
import {
  CANCEL_REASON_MAX,
  validateEventInput,
  type EditorErrors,
  type EventEditorState,
} from "@/lib/events/editor";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Gli errori che l'interfaccia sa tradurre.
 *
 * Sono **codici**, non messaggi: il testo del database non deve mai arrivare a
 * chi usa il sito (prima ci arrivava). I dizionari fanno la traduzione.
 */
export type EventActionError = "generic" | "rateLimited" | "suspended";

export type EventActionResult = { ok: boolean; error: EventActionError | null };

/**
 * Come si legge un errore del database.
 *
 * Il database parla per codici SQLSTATE: `OS429` è il tetto anti-spam, `OS403`
 * l'account sospeso (migration `0020`). Tutto il resto è un errore generico.
 */
const SQLSTATE_TO_ERROR: Record<string, EventActionError> = {
  OS429: "rateLimited",
  OS403: "suspended",
};

function result(error: { code?: string; message: string } | null): EventActionResult {
  if (!error) return { ok: true, error: null };

  console.error("[events]", error.message);

  return { ok: false, error: (error.code && SQLSTATE_TO_ERROR[error.code]) || "generic" };
}

/**
 * Pubblica, annulla o rimette in programma un evento.
 *
 * Qui non ci sono scorciatoie: il database rifà tutti i controlli. Chi non è
 * ancora verificato resta in bozza (`events_require_review`) e chi non è il
 * proprietario dell'evento non passa la policy, qualunque cosa arrivi da qui.
 *
 * La data dell'annullamento non si manda: la mette il database (`0022`). Il
 * motivo, se c'è, si vede sulla pagina pubblica — che resta viva.
 */
export async function setEventStatusAction(input: {
  eventId: string;
  status: "published" | "cancelled";
  /** Perché si annulla: facoltativo, si legge sulla pagina dell'evento. */
  reason?: string | null;
}): Promise<EventActionResult> {
  const supabase = await createClient();
  const reason = input.reason?.trim().slice(0, CANCEL_REASON_MAX) ?? "";

  const { error } = await supabase
    .from("events")
    .update({
      status: input.status,
      // Tornando in programma il motivo si scarta: la serata è quella di prima.
      cancel_reason: input.status === "cancelled" && reason ? reason : null,
    })
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
  error?: "unauthorized" | "notFound" | "rateLimited" | "suspended" | "saveFailed";
};

/** Il salvataggio non è riuscito: si traduce il codice del database. */
function saveErrorCode(error: { code?: string }): NonNullable<SaveEventResult["error"]> {
  const mapped = error.code ? SQLSTATE_TO_ERROR[error.code] : undefined;

  return mapped === "rateLimited" || mapped === "suspended" ? mapped : "saveFailed";
}

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
    cover_image_url: values.coverImageUrl,
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
      return { ok: false, error: saveErrorCode(error) };
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
    return { ok: false, error: saveErrorCode(error) };
  }

  if (!data) return { ok: false, error: "saveFailed" };

  revalidatePath("/dashboard");

  return { ok: true, eventId: data.id, status: data.status as SaveEventResult["status"] };
}
