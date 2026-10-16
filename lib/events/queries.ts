import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import type { EventKind, LocationPrecision, PublicEvent } from "./types";

/**
 * Lettura degli eventi pubblici.
 *
 * La visibilità è decisa dal database (`events_select_public`: al pubblico solo
 * gli eventi `published`), quindi ogni query qui filtra comunque su
 * `status = 'published'` — così il piano di esecuzione usa gli indici parziali.
 */

const EVENT_SELECT = [
  "id",
  "title",
  "description",
  "starts_at",
  "timezone",
  "city",
  "latitude",
  "longitude",
  "location_precision",
  "area_radius_m",
  "genre",
  "kind",
  "is_free",
  "ticket_url",
  "cover_image_url",
  "is_featured",
  "is_unclaimed",
  "artists ( id, name, city )",
  "venues ( id, name, city, address )",
].join(", ");

type Embedded<T> = T | T[] | null;

type ArtistRow = { id: string; name: string; city: string | null };
type VenueRow = { id: string; name: string; city: string | null; address: string | null };

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  timezone: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  location_precision: LocationPrecision | null;
  area_radius_m: number | null;
  genre: string | null;
  kind: EventKind | null;
  is_free: boolean | null;
  ticket_url: string | null;
  cover_image_url: string | null;
  is_featured: boolean | null;
  is_unclaimed: boolean | null;
  artists: Embedded<ArtistRow>;
  venues: Embedded<VenueRow>;
};

function first<T>(value: Embedded<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toPublicEvent(row: EventRow): PublicEvent {
  const artist = first(row.artists);
  const venue = first(row.venues);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    timezone: row.timezone ?? "Europe/Rome",
    city: row.city ?? venue?.city ?? artist?.city ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    locationPrecision: row.location_precision ?? "exact",
    areaRadiusM: row.area_radius_m,
    genre: row.genre,
    kind: row.kind ?? "concert",
    isFree: row.is_free ?? false,
    ticketUrl: row.ticket_url,
    coverImageUrl: row.cover_image_url,
    isFeatured: row.is_featured ?? false,
    isUnclaimed: row.is_unclaimed ?? false,
    artist: artist ? { id: artist.id, name: artist.name, city: artist.city } : null,
    venue: venue
      ? { id: venue.id, name: venue.name, city: venue.city, address: venue.address }
      : null,
  };
}

export type EventFilters = {
  /** Inizio finestra temporale (ISO). Default: adesso. */
  from?: string;
  /** Fine finestra temporale (ISO). */
  to?: string;
  genre?: string | null;
  kind?: EventKind | null;
  freeOnly?: boolean;
  bbox?: {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
  } | null;
};

export type EventListResult = {
  events: PublicEvent[];
  total: number;
};

function startOfNow(filters: EventFilters): string {
  return filters.from ?? new Date().toISOString();
}

export type ListEventsOptions = {
  filters?: EventFilters;
  page?: number;
  perPage?: number;
  /** Solo eventi con coordinate reali (per la mappa). */
  onlyLocated?: boolean;
};

/** Eventi pubblici futuri, ordinati per data, con paginazione opzionale. */
export async function listEvents({
  filters = {},
  page = 1,
  perPage = 12,
  onlyLocated = false,
}: ListEventsOptions = {}): Promise<EventListResult> {
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select(EVENT_SELECT, { count: "exact" })
    .eq("status", "published")
    .gte("starts_at", startOfNow(filters))
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true });

  if (filters.to) query = query.lte("starts_at", filters.to);
  if (filters.genre) query = query.eq("genre", filters.genre);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.freeOnly) query = query.eq("is_free", true);
  if (onlyLocated) {
    query = query.not("latitude", "is", null).not("longitude", "is", null);
  }
  if (filters.bbox) {
    query = query
      .gte("latitude", filters.bbox.minLatitude)
      .lte("latitude", filters.bbox.maxLatitude)
      .gte("longitude", filters.bbox.minLongitude)
      .lte("longitude", filters.bbox.maxLongitude);
  }

  const from = Math.max(0, (page - 1) * perPage);
  query = query.range(from, from + perPage - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("[events] listEvents:", error.message);
    return { events: [], total: 0 };
  }

  return {
    events: (data as unknown as EventRow[]).map(toPublicEvent),
    total: count ?? 0,
  };
}

/** Eventi da mostrare come pin sulla mappa: solo quelli con coordinate. */
export async function listMapEvents(
  filters: EventFilters = {},
  limit = 400
): Promise<PublicEvent[]> {
  const { events } = await listEvents({
    filters,
    page: 1,
    perPage: limit,
    onlyLocated: true,
  });
  return events;
}

/** Eventi in evidenza (massimo 3 slot nella Home). */
export async function listFeaturedEvents(limit = 3): Promise<PublicEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "published")
    .eq("is_featured", true)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[events] listFeaturedEvents:", error.message);
    return [];
  }

  return (data as unknown as EventRow[]).map(toPublicEvent);
}

/** Singolo evento pubblico. `null` quando non esiste o non è visibile. */
export const getEventById = cache(async (id: string): Promise<PublicEvent | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[events] getEventById:", error.message);
    return null;
  }

  return toPublicEvent(data as unknown as EventRow);
});

/** Generi realmente presenti negli eventi pubblicati (per i filtri). */
export async function listGenres(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("genre")
    .eq("status", "published")
    .not("genre", "is", null)
    .order("genre", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[events] listGenres:", error.message);
    return [];
  }

  const genres = new Set<string>();
  for (const row of data as Array<{ genre: string | null }>) {
    if (row.genre) genres.add(row.genre);
  }
  return [...genres].sort((a, b) => a.localeCompare(b));
}

export type DiscoveryCounters = {
  events: number;
  artists: number;
  venues: number;
  cities: number;
};

/** Contatori reali mostrati nella bento grid della Home. */
export async function getDiscoveryCounters(): Promise<DiscoveryCounters> {
  const supabase = await createClient();

  const [events, artists, venues, cities] = await Promise.all([
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString()),
    supabase.from("artists").select("id", { count: "exact", head: true }),
    supabase.from("venues").select("id", { count: "exact", head: true }),
    supabase.from("events").select("city").eq("status", "published").not("city", "is", null),
  ]);

  const citySet = new Set<string>();
  for (const row of (cities.data ?? []) as Array<{ city: string | null }>) {
    if (row.city) citySet.add(row.city);
  }

  return {
    events: events.count ?? 0,
    artists: artists.count ?? 0,
    venues: venues.count ?? 0,
    cities: citySet.size,
  };
}

/**
 * Eventi salvati dal profilo collegato.
 * La RLS limita le righe al proprietario: nessun filtro lato applicazione.
 */
export async function listSavedEventIds(): Promise<Set<string>> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("saved_events").select("event_id");

  if (error) {
    console.error("[events] listSavedEventIds:", error.message);
    return new Set();
  }

  return new Set((data as Array<{ event_id: string }>).map((row) => row.event_id));
}
