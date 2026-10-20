import { cache } from "react";

import { EVENT_SELECT, toPublicEvent, type EventRow } from "@/lib/events/queries";
import type { PublicEvent } from "@/lib/events/types";
import { cityKey, preferredCityLabel } from "@/lib/geo/city";
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

export type DashboardEvent = PublicEvent & {
  status: DashboardStatus;
  /** Quando è stata salvata l'ultima volta: serve a non sovrascriversi a vicenda. */
  updatedAt: string;
};

type DashboardRow = EventRow & { status: DashboardStatus; updated_at: string };

/** Gli eventi creati da questo profilo, in ordine di data (i prossimi per primi). */
export const listMyEvents = cache(async (profileId: string): Promise<DashboardEvent[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(`${EVENT_SELECT}, updated_at`)
    .eq("created_by", profileId)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[dashboard] listMyEvents:", error.message);
    return [];
  }

  return (data as unknown as DashboardRow[]).map((row) => ({
    ...toPublicEvent(row),
    status: row.status,
    updatedAt: row.updated_at,
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

/**
 * Gli eventi salvati dal profilo collegato, dall'ultimo salvato.
 *
 * Ci sono anche quelli **annullati**, marcati: chi aveva salvato una serata deve
 * sapere che non si tiene. Fino a quando le email non esistono (Fase 6) la
 * dashboard è l'unico posto dove quella notizia può arrivare.
 */
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

/**
 * Un proprio evento, per la pagina di modifica.
 *
 * Il filtro su `created_by` è esplicito: senza di esso un admin potrebbe aprire
 * dal proprio pannello l'evento di un altro, e la modifica diventerebbe un
 * effetto collaterale di un indirizzo scritto a mano.
 */
export const getMyEvent = cache(
  async (id: string, profileId: string): Promise<DashboardEvent | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("events")
      .select(`${EVENT_SELECT}, updated_at`)
      .eq("id", id)
      .eq("created_by", profileId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("[dashboard] getMyEvent:", error.message);
      return null;
    }

    const row = data as unknown as DashboardRow;

    return { ...toPublicEvent(row), status: row.status, updatedAt: row.updated_at };
  }
);

/** Un locale già su OpenStage: serve a collegare l'evento senza riscriverlo. */
export type VenueOption = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

/**
 * Ricerca fra i locali già presenti.
 *
 * Nessun servizio esterno: la fonte è il nostro database, quindi quello che si
 * collega esiste davvero. Se un locale non c'è, l'evento porta il suo nome
 * scritto a mano (`events.venue_name`).
 */
export async function searchVenues(query: string, limit = 6): Promise<VenueOption[]> {
  const term = query.replace(/[%_]/g, "").trim();
  if (term.length < 2) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venues")
    .select("id, name, city, address, latitude, longitude")
    .or(`name.ilike.%${term}%,city.ilike.%${term}%`)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[dashboard] searchVenues:", error.message);
    return [];
  }

  return (data ?? []) as VenueOption[];
}

/** Un artista già su OpenStage: serve al locale per collegare la serata. */
export type ArtistOption = {
  id: string;
  name: string;
  city: string | null;
};

/**
 * Ricerca fra gli artisti già presenti.
 *
 * Stessa idea della ricerca dei locali: se l'artista ha una scheda, la serata
 * compare sulla sua pagina; se non ce l'ha, si scrive il nome del locale a mano
 * e l'artista resta fuori. La ricerca è aperta a chi ha una sessione.
 */
export async function searchArtists(query: string, limit = 6): Promise<ArtistOption[]> {
  const term = query.replace(/[%_]/g, "").trim();
  if (term.length < 2) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("artists")
    .select("id, name, city")
    .or(`name.ilike.%${term}%,city.ilike.%${term}%`)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[dashboard] searchArtists:", error.message);
    return [];
  }

  return (data ?? []) as ArtistOption[];
}

/**
 * Le città che usiamo già: servono a scrivere "Livorno" come lo scrive la
 * piattaforma, invece di "livorno" (che non troverebbe nessuno).
 */
export async function listCityOptions(limit = 200): Promise<string[]> {
  const supabase = await createClient();

  const [venues, events] = await Promise.all([
    supabase.from("venues").select("city").not("city", "is", null).limit(500),
    supabase.from("events").select("city").not("city", "is", null).limit(500),
  ]);

  if (venues.error) console.error("[dashboard] listCityOptions (venues):", venues.error.message);
  if (events.error) console.error("[dashboard] listCityOptions (events):", events.error.message);

  const groups = new Map<string, string[]>();

  for (const row of [...(venues.data ?? []), ...(events.data ?? [])] as Array<{ city: string | null }>) {
    const city = row.city?.trim();
    const key = cityKey(city);
    if (!city || !key) continue;

    groups.set(key, [...(groups.get(key) ?? []), city]);
  }

  return [...groups.values()]
    .map((values) => preferredCityLabel(values))
    .filter((city): city is string => city !== null)
    .sort((a, b) => a.localeCompare(b, "it"))
    .slice(0, limit);
}
