import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import type { EventKind, LocationPrecision, PublicEvent } from "./types";

/**
 * Lettura degli eventi pubblici.
 *
 * La visibilità è decisa dal database (`events_select_public`: al pubblico gli
 * eventi `published`, e gli `cancelled` che restano leggibili solo per la loro
 * pagina). Gli **elenchi** di qui — ricerca, mappa, Home, schede di artisti e
 * locali — leggono volutamente solo `published`: un annullato non è più una
 * destinazione. La pagina dell'evento (`getEventById`/`getEventBySlug`) non
 * filtra, e per questo può mostrarlo con l'etichetta "Annullato".
 */

export const EVENT_SELECT = [
  "id",
  "slug",
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
  "price_text",
  "venue_name",
  "cover_image_url",
  "is_featured",
  "directions_text",
  // Stato e annullamento servono alla **pagina** dell'evento (che resta viva
  // anche per un annullato) e ai Preferiti, che lo mostrano marcato. Gli elenchi
  // pubblici non li mostrano: leggono solo `published`.
  "status",
  "cancelled_at",
  "cancel_reason",
  "artists ( id, slug, name, city, profile_id )",
  "venues ( id, slug, name, city, address, website, profile_id )",
].join(", ");

type Embedded<T> = T | T[] | null;

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  /** Chi amministra la scheda: serve a dire se è ancora "non reclamata". */
  profile_id: string | null;
};
type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  website: string | null;
  profile_id: string | null;
};

export type EventRow = {
  id: string;
  slug: string;
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
  price_text: string | null;
  venue_name: string | null;
  cover_image_url: string | null;
  is_featured: boolean | null;
  /**
   * «Come arrivare». Facoltativo come `status`: la ricerca (`search_events`)
   * restituisce solo le colonne che le servono.
   */
  directions_text?: string | null;
  /**
   * Lo stato della riga.
   *
   * Facoltativo perché la ricerca (`search_events`) legge **solo** i pubblicati e
   * non restituisce questa colonna: lì vale il valore di partenza.
   */
  status?: "draft" | "published" | "cancelled" | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  artists: Embedded<ArtistRow>;
  venues: Embedded<VenueRow>;
};

function first<T>(value: Embedded<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function toPublicEvent(row: EventRow): PublicEvent {
  const artist = first(row.artists);
  const venue = first(row.venues);

  // "Non reclamato" non è un campo salvato: è un fatto delle schede collegate.
  // L'evento l'ha messo OpenStage se **almeno una** delle due esiste e
  // **nessuna** è stata reclamata. Senza artista né locale non c'è nessuna
  // scheda da reclamare, quindi la nota non ha senso e non compare.
  const hasPage = artist !== null || venue !== null;
  const isUnclaimed = hasPage && !artist?.profile_id && !venue?.profile_id;

  return {
    id: row.id,
    slug: row.slug,
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
    priceText: row.price_text,
    venueName: row.venue_name,
    directionsText: row.directions_text ?? null,
    coverImageUrl: row.cover_image_url,
    isFeatured: row.is_featured ?? false,
    isUnclaimed,
    status: row.status ?? "published",
    cancelledAt: row.cancelled_at ?? null,
    cancelReason: row.cancel_reason ?? null,
    artist: artist
      ? { id: artist.id, slug: artist.slug, name: artist.name, city: artist.city }
      : null,
    venue: venue
      ? {
          id: venue.id,
          slug: venue.slug,
          name: venue.name,
          city: venue.city,
          address: venue.address,
          website: venue.website,
        }
      : null,
  };
}

export type EventFilters = {
  /** Ricerca libera: titolo, città, genere, artista, locale. */
  query?: string | null;
  /** Inizio finestra temporale (ISO). Default: adesso. */
  from?: string | null;
  /** Fine finestra temporale (ISO). */
  to?: string | null;
  genre?: string | null;
  kind?: EventKind | null;
  freeOnly?: boolean;
  /** Centro del filtro per raggio. */
  center?: { latitude: number; longitude: number } | null;
  radiusKm?: number | null;
};

export type EventListResult = {
  events: PublicEvent[];
  total: number;
};

export type ListEventsOptions = {
  filters?: EventFilters;
  page?: number;
  perPage?: number;
  /** Solo eventi con coordinate reali (per la mappa). */
  onlyLocated?: boolean;
};

/**
 * Eventi pubblici futuri, ordinati per data, con paginazione.
 *
 * Ricerca, filtri e raggio si risolvono nel database (`search_events`): lista e
 * mappa vedono così **lo stesso** insieme, e la paginazione resta corretta anche
 * con il filtro per distanza (che altrimenti andrebbe applicato dopo il taglio).
 */
export async function listEvents({
  filters = {},
  page = 1,
  perPage = 12,
  onlyLocated = false,
}: ListEventsOptions = {}): Promise<EventListResult> {
  const supabase = await createClient();
  const offset = Math.max(0, (page - 1) * perPage);

  const { data, error } = await supabase.rpc("search_events", {
    p_query: filters.query ?? null,
    p_from: filters.from ?? new Date().toISOString(),
    p_to: filters.to ?? null,
    p_genre: filters.genre ?? null,
    p_kind: filters.kind ?? null,
    p_free_only: filters.freeOnly ?? false,
    p_lat: filters.center?.latitude ?? null,
    p_lng: filters.center?.longitude ?? null,
    p_radius_km: filters.radiusKm ?? null,
    p_only_located: onlyLocated,
    p_limit: perPage,
    p_offset: offset,
  });

  if (error) {
    console.error("[events] listEvents:", error.message);
    return { events: [], total: 0 };
  }

  const rows = (data ?? []) as unknown as Array<EventRow & { total_count: number }>;

  return {
    events: rows.map(toPublicEvent),
    // Il totale viaggia con ogni riga (`count(*) over ()`).
    total: rows[0]?.total_count ?? 0,
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

/**
 * Eventi in evidenza (massimo 3 slot nella Home).
 *
 * `featured_until` è una scadenza vera: un evento in vetrina smette di esserlo
 * da solo quando la data passa, senza che nessuno debba ricordarsene.
 */
export async function listFeaturedEvents(limit = 3): Promise<PublicEvent[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "published")
    .eq("is_featured", true)
    .gte("starts_at", now)
    .or(`featured_until.is.null,featured_until.gt.${now}`)
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

/** Singolo evento pubblico a partire dall'indirizzo leggibile (`slug`). */
export const getEventBySlug = cache(async (slug: string): Promise<PublicEvent | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[events] getEventBySlug:", error.message);
    return null;
  }

  return toPublicEvent(data as unknown as EventRow);
});

/**
 * Prossimi eventi di un artista o in un locale (schede pubbliche).
 *
 * Gli eventi passati non si nascondono per censura: semplicemente non fanno
 * parte di "cosa succede adesso", quindi la scheda mostra il futuro.
 */
async function listUpcomingBy(
  column: "artist_id" | "venue_id",
  id: string,
  limit: number
): Promise<PublicEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "published")
    .eq(column, id)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[events] listUpcomingBy:", error.message);
    return [];
  }

  return (data as unknown as EventRow[]).map(toPublicEvent);
}

export function listUpcomingEventsByArtist(artistId: string, limit = 24): Promise<PublicEvent[]> {
  return listUpcomingBy("artist_id", artistId, limit);
}

export function listUpcomingEventsByVenue(venueId: string, limit = 24): Promise<PublicEvent[]> {
  return listUpcomingBy("venue_id", venueId, limit);
}

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

export type SuggestionKind = "city" | "artist" | "venue" | "genre" | "event";

export type EventSuggestion = {
  kind: SuggestionKind;
  id: string | null;
  label: string;
  detail: string | null;
  /** Quanti eventi in programma porta con sé il suggerimento. */
  hits: number;
  /** Indirizzo leggibile: valorizzato per artisti, locali ed eventi. */
  slug: string | null;
  /** Città dell'evento: serve a comporre l'indirizzo canonico. */
  city: string | null;
};

/**
 * Suggerimenti della barra di ricerca, raggruppati per tipo.
 *
 * Fonte unica: il nostro database (città, artisti, locali, generi, eventi già
 * pubblicati). Nessun geocoder esterno, quindi nessun suggerimento che porta
 * fuori da OpenStage.
 */
export async function suggestEvents(query: string, limit = 4): Promise<EventSuggestion[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_suggestions", {
    p_query: term,
    p_limit: limit,
  });

  if (error) {
    console.error("[events] suggestEvents:", error.message);
    return [];
  }

  return (data ?? []) as unknown as EventSuggestion[];
}
