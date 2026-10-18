import { cache } from "react";

import { EVENT_SELECT, toPublicEvent, type EventRow } from "@/lib/events/queries";
import type { PublicEvent } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Lettura degli eventi della dashboard.
 *
 * Regola di fondo: la visibilità la decide il database (`events_select_public`),
 * quindi qui non c'è nessun controllo di permessi da tenere allineato. Il filtro
 * su `created_by` serve a un'altra cosa: gli eventi **pubblicati** sono
 * leggibili da chiunque, e senza filtro finirebbero nell'elenco "i miei eventi"
 * anche quelli inseriti da altri.
 */

export type DashboardStatus = "draft" | "published" | "cancelled";

export type DashboardEvent = PublicEvent & { status: DashboardStatus };

type DashboardRow = EventRow & { status: DashboardStatus };

/** Gli eventi creati da questo profilo, in ordine di data (i prossimi per primi). */
export const listMyEvents = cache(async (profileId: string): Promise<DashboardEvent[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(`${EVENT_SELECT}, status`)
    .eq("created_by", profileId)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[dashboard] listMyEvents:", error.message);
    return [];
  }

  return (data as unknown as DashboardRow[]).map((row) => ({
    ...toPublicEvent(row),
    status: row.status,
  }));
});

/** Il profilo collegato ha già ricevuto la verifica? (`profiles.verified_at`) */
export const isProfileVerified = cache(async (profileId: string): Promise<boolean> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("verified_at")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    console.error("[dashboard] isProfileVerified:", error.message);
    return false;
  }

  return data?.verified_at != null;
});

/** Gli eventi salvati dal profilo collegato, dall'ultimo salvato. */
export const listSavedEvents = cache(async (): Promise<PublicEvent[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("saved_events")
    .select(`event_id, events ( ${EVENT_SELECT} )`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard] listSavedEvents:", error.message);
    return [];
  }

  return (data as unknown as Array<{ events: EventRow | EventRow[] | null }>)
    .map((row) => (Array.isArray(row.events) ? (row.events[0] ?? null) : row.events))
    .filter((row): row is EventRow => row !== null)
    .map(toPublicEvent);
});
