import { cache } from "react";

import { ITEMS_PER_PAGE } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";

/**
 * Lettura delle directory pubbliche: artisti e locali.
 *
 * Su entrambe le tabelle la RLS è già "select pubblico", quindi qui non serve
 * altro che filtrare, ordinare e paginare. Nessun dato inventato: "non
 * reclamato" non è un'etichetta commerciale ma un fatto (`profile_id is null`).
 *
 * I campi restituiti sono solo quelli che le schede pubbliche mostrano: il
 * profilo collegato (email, ruolo) non esce mai dal database.
 */

const ARTIST_SELECT = "id, slug, name, city, genre, spotify_url, bio, profile_id";
const VENUE_SELECT =
  "id, slug, name, city, address, website, latitude, longitude, capacity, profile_id";

export type PublicArtist = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genre: string | null;
  spotifyUrl: string | null;
  bio: string | null;
  /** Nessuno ha ancora reclamato la scheda. */
  claimed: boolean;
};

export type PublicVenue = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  claimed: boolean;
};

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genre: string | null;
  spotify_url: string | null;
  bio: string | null;
  profile_id: string | null;
};

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  profile_id: string | null;
};

function toArtist(row: ArtistRow): PublicArtist {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    genre: row.genre,
    spotifyUrl: row.spotify_url,
    bio: row.bio,
    claimed: row.profile_id !== null,
  };
}

function toVenue(row: VenueRow): PublicVenue {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    address: row.address,
    website: row.website,
    latitude: row.latitude,
    longitude: row.longitude,
    capacity: row.capacity,
    claimed: row.profile_id !== null,
  };
}

export type DirectoryFilters = {
  /** Ricerca libera sul nome. */
  query?: string | null;
  city?: string | null;
  genre?: string | null;
};

export type DirectoryOptions = {
  filters?: DirectoryFilters;
  page?: number;
  perPage?: number;
};

export type DirectoryResult<T> = {
  items: T[];
  total: number;
};

/**
 * Il testo digitato dall'utente non deve poter introdurre jolly: nei filtri di
 * PostgREST alcuni caratteri hanno un significato (`*` diventa `%`, virgole e
 * parentesi separano i filtri). Si ripulisce invece di fidarsi.
 */
function cleanTerm(value: string): string {
  return value
    .replace(/[%_*,()\\:."'<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function listArtists({
  filters = {},
  page = 1,
  perPage = ITEMS_PER_PAGE,
}: DirectoryOptions = {}): Promise<DirectoryResult<PublicArtist>> {
  const supabase = await createClient();
  const offset = Math.max(0, (page - 1) * perPage);
  const term = cleanTerm(filters.query ?? "");

  let query = supabase.from("artists").select(ARTIST_SELECT, { count: "exact" });

  if (term) query = query.ilike("name", `%${term}%`);
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.genre) query = query.eq("genre", filters.genre);

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + perPage - 1);

  if (error) {
    console.error("[directory] listArtists:", error.message);
    return { items: [], total: 0 };
  }

  return { items: (data as unknown as ArtistRow[]).map(toArtist), total: count ?? 0 };
}

export async function listVenues({
  filters = {},
  page = 1,
  perPage = ITEMS_PER_PAGE,
}: DirectoryOptions = {}): Promise<DirectoryResult<PublicVenue>> {
  const supabase = await createClient();
  const offset = Math.max(0, (page - 1) * perPage);
  const term = cleanTerm(filters.query ?? "");

  let query = supabase.from("venues").select(VENUE_SELECT, { count: "exact" });

  if (term) query = query.ilike("name", `%${term}%`);
  if (filters.city) query = query.eq("city", filters.city);

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + perPage - 1);

  if (error) {
    console.error("[directory] listVenues:", error.message);
    return { items: [], total: 0 };
  }

  return { items: (data as unknown as VenueRow[]).map(toVenue), total: count ?? 0 };
}

/** Valori realmente presenti in tabella, per riempire i menu dei filtri. */
async function listDistinct(
  table: "artists" | "venues",
  column: "city" | "genre"
): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(table)
    .select(column)
    .not(column, "is", null)
    .order(column, { ascending: true })
    .limit(1000);

  if (error) {
    console.error(`[directory] listDistinct ${table}.${column}:`, error.message);
    return [];
  }

  const values = new Set<string>();
  for (const row of data as Array<Record<string, string | null>>) {
    const value = row[column];
    if (value) values.add(value);
  }

  return [...values].sort((a, b) => a.localeCompare(b));
}

export function listArtistCities(): Promise<string[]> {
  return listDistinct("artists", "city");
}

export function listArtistGenres(): Promise<string[]> {
  return listDistinct("artists", "genre");
}

export function listVenueCities(): Promise<string[]> {
  return listDistinct("venues", "city");
}

/** Scheda pubblica di un artista. `null` se l'indirizzo non esiste. */
export const getArtistBySlug = cache(async (slug: string): Promise<PublicArtist | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("artists")
    .select(ARTIST_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[directory] getArtistBySlug:", error.message);
    return null;
  }

  return toArtist(data as unknown as ArtistRow);
});

/** Scheda pubblica di un locale. `null` se l'indirizzo non esiste. */
export const getVenueBySlug = cache(async (slug: string): Promise<PublicVenue | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venues")
    .select(VENUE_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[directory] getVenueBySlug:", error.message);
    return null;
  }

  return toVenue(data as unknown as VenueRow);
});
