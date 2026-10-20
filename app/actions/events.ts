"use server";

import { revalidatePath } from "next/cache";

import { canManageEvents } from "@/lib/auth/roles";
import { getArtistByProfileId } from "@/lib/directory/queries";
import {
  CANCEL_REASON_MAX,
  CLIENT_KEY_MAX,
  validateEventInput,
  type EditorErrors,
  type EventEditorState,
} from "@/lib/events/editor";
import { isTicketUrlReachable } from "@/lib/events/links";
import { checkEventLocation, SAVE_CHECK_TIMEOUT_MS } from "@/lib/geo/location-check";
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
  /** Quando è stata salvata: il modulo lo rimanda al salvataggio successivo. */
  updatedAt?: string;
  fieldErrors?: EditorErrors;
  /** Codice da tradurre con i dizionari (mai il messaggio grezzo del database). */
  error?:
    | "unauthorized"
    | "notFound"
    | "conflict"
    | "rateLimited"
    | "suspended"
    | "saveFailed";
};

/** Il salvataggio non è riuscito: si traduce il codice del database. */
function saveErrorCode(error: { code?: string }): NonNullable<SaveEventResult["error"]> {
  const mapped = error.code ? SQLSTATE_TO_ERROR[error.code] : undefined;

  return mapped === "rateLimited" || mapped === "suspended" ? mapped : "saveFailed";
}

/** La chiave del modulo, ripulita: o è una chiave vera, o non c'è. */
function cleanClientKey(value: string | null | undefined): string | null {
  const key = value?.trim() ?? "";

  return key === "" ? null : key.slice(0, CLIENT_KEY_MAX);
}

/**
 * Crea o aggiorna un evento.
 *
 * Il modulo manda solo i campi che l'utente può scegliere: chi scrive l'evento
 * (`created_by`) e l'artista della serata (`artist_id`) li decide il server, così
 * nessuno può attribuire un concerto a un altro. Le regole di validità stanno in
 * `lib/events/editor.ts`, le autorizzazioni nella RLS: qui si mettono insieme.
 *
 * Tre difese contro i dati sbagliati che nascono *dal salvataggio stesso*:
 * la chiave del modulo (un invio ripetuto non crea una seconda serata), la data
 * di lettura (due schede aperte non si sovrascrivono) e il link dei biglietti.
 */
export async function saveEventAction(input: {
  eventId: string | null;
  status: "draft" | "published" | "cancelled";
  values: EventEditorState;
  /** Chiave del modulo aperto: rende innocuo un invio ripetuto. */
  clientKey?: string | null;
  /** Quando l'evento è stato letto: se qualcuno l'ha toccato, non si sovrascrive. */
  expectedUpdatedAt?: string | null;
}): Promise<SaveEventResult> {
  const session = await getSessionProfile();

  if (!session || !canManageEvents(session.role)) {
    return { ok: false, error: "unauthorized" };
  }

  // Una serata **nuova** non può stare nel passato (tranne le ultime ore: un
  // concerto appena cominciato è ancora "stasera"). Una che esiste già sì:
  // correggere una riga vecchia non deve obbligare a spostarla.
  const validated = validateEventInput(input.values, { allowPast: input.eventId !== null });

  if (!validated.ok) {
    return { ok: false, fieldErrors: validated.errors };
  }

  const values = validated.values;

  // La posizione si controlla **adesso**, non solo mentre si trascina il pin:
  // il database non sa dov'è il mare, e un "Milano" con il pin a Berlino è
  // quasi sempre un pin rimasto dov'era. Se il geocodificatore è giù non si
  // blocca nessuno: l'incertezza non è colpa di chi pubblica.
  const location = await checkEventLocation({
    latitude: values.latitude,
    longitude: values.longitude,
    city: values.city,
    locale: "it",
    timeoutMs: SAVE_CHECK_TIMEOUT_MS,
  });

  if (location.status === "empty") {
    return { ok: false, fieldErrors: { location: "locationEmpty" } };
  }

  if (location.status === "impossible") {
    return { ok: false, fieldErrors: { location: "locationTooFar" } };
  }

  // Il link dei biglietti si prova **prima** di salvare: un link morto nella
  // chiamata più importante della serata è peggio di mezzo secondo d'attesa.
  // Un sito che non risponde al controllo, però, non è un link morto.
  if (values.ticketUrl && !(await isTicketUrlReachable(values.ticketUrl))) {
    return { ok: false, fieldErrors: { ticketUrl: "ticketUnreachable" } };
  }

  const supabase = await createClient();

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
    directions_text: values.directionsText,
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
    let update = supabase.from("events").update(payload).eq("id", input.eventId);

    // Se il modulo sa **da quando** sta lavorando, il salvataggio vale solo se
    // nel frattempo nessuno ha toccato la riga: due schede aperte sullo stesso
    // evento non si sovrascrivono a vicenda in silenzio.
    if (input.expectedUpdatedAt) {
      update = update.eq("updated_at", input.expectedUpdatedAt);
    }

    const { data, error } = await update.select("id, status, updated_at").maybeSingle();

    if (error) {
      console.error("[events] saveEventAction (modifica):", error.message);
      return { ok: false, error: saveErrorCode(error) };
    }

    if (!data) {
      // Distinguere "non è tua" da "l'ha cambiata qualcun altro": la prima è
      // un indirizzo sbagliato, la seconda è una scheda vecchia da ricaricare.
      const { data: existing } = await supabase
        .from("events")
        .select("id")
        .eq("id", input.eventId)
        .maybeSingle();

      return { ok: false, error: existing ? "conflict" : "notFound" };
    }

    revalidatePath("/dashboard");

    return {
      ok: true,
      eventId: data.id,
      status: data.status as SaveEventResult["status"],
      updatedAt: data.updated_at,
    };
  }

  // L'artista della serata è chi la crea: non si sceglie dal modulo.
  const artist = await getArtistByProfileId(session.id);
  const clientKey = cleanClientKey(input.clientKey);

  // Stessa chiave, stessa serata: la rete ha ripetuto l'invio, o il dito è
  // scivolato due volte. La seconda volta si restituisce quella già creata.
  if (clientKey) {
    const { data: existing } = await supabase
      .from("events")
      .select("id, status, updated_at")
      .eq("created_by", session.id)
      .eq("client_key", clientKey)
      .maybeSingle();

    if (existing) {
      return {
        ok: true,
        eventId: existing.id,
        status: existing.status as SaveEventResult["status"],
        updatedAt: existing.updated_at,
      };
    }
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ ...payload, created_by: session.id, artist_id: artist?.id ?? null, client_key: clientKey })
    .select("id, status, updated_at")
    .maybeSingle();

  if (error) {
    // Corsa vera: due invii davvero simultanei. L'indice unico ferma il secondo,
    // e qui si restituisce la serata che il primo ha creato.
    if (clientKey && error.code === "23505") {
      const { data: existing } = await supabase
        .from("events")
        .select("id, status, updated_at")
        .eq("created_by", session.id)
        .eq("client_key", clientKey)
        .maybeSingle();

      if (existing) {
        return {
          ok: true,
          eventId: existing.id,
          status: existing.status as SaveEventResult["status"],
          updatedAt: existing.updated_at,
        };
      }
    }

    console.error("[events] saveEventAction (creazione):", error.message);
    return { ok: false, error: saveErrorCode(error) };
  }

  if (!data) return { ok: false, error: "saveFailed" };

  revalidatePath("/dashboard");

  return {
    ok: true,
    eventId: data.id,
    status: data.status as SaveEventResult["status"],
    updatedAt: data.updated_at,
  };
}
