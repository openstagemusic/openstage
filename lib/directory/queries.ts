import { cache } from "react";

import { cityKey, preferredCityLabel } from "@/lib/geo/city";
import type { SocialUrls } from "@/lib/social/links";
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

const ARTIST_SELECT =
  "id, slug, name, city, genre, spotify_url, bio, profile_id, website_url, instagram_url, facebook_url, tiktok_url, youtube_url, soundcloud_url, bandcamp_url, linktree_url, epk_photo_url, epk_rider, epk_contact";
const VENUE_SELECT =
  "id, slug, name, city, address, website, latitude, longitude, capacity, profile_id, instagram_url, facebook_url, tiktok_url, youtube_url, soundcloud_url, bandcamp_url, linktree_url";

export type PublicArtist = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genre: string | null;
  spotifyUrl: string | null;
  bio: string | null;
  /** Sito e social reali; le icone compaiono solo per i campi compilati. */
  links: SocialUrls;
  /** Dati del press kit: foto, rider e contatto pubblico. */
  epkPhotoUrl: string | null;
  epkRider: string | null;
  epkContact: string | null;
  /** Nessuno ha ancora reclamato la scheda. */
  claimed: boolean;
  /** Il profilo che l'ha reclamata: serve solo a riconoscere la propria. */
  profileId: string | null;
  /** La scheda è di un profilo che OpenStage ha verificato. */
  verified: boolean;
};

export type PublicVenue = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  website: string | null;
  links: SocialUrls;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  claimed: boolean;
  profileId: string | null;
  verified: boolean;
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
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  soundcloud_url: string | null;
  bandcamp_url: string | null;
  linktree_url: string | null;
  epk_photo_url: string | null;
  epk_rider: string | null;
  epk_contact: string | null;
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
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  soundcloud_url: string | null;
  bandcamp_url: string | null;
  linktree_url: string | null;
};

/**
 * I profili verificati, per il badge pubblico "Verificato".
 *
 * `profiles` è leggibile solo da sé stessi o dall'admin (contiene l'email), ma
 * la verifica è un fatto pubblico: arriva da una funzione dedicata che espone
 * solo gli identificativi. `cache()` la esegue una volta per richiesta.
 */
export const verifiedProfileIds = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("verified_profile_ids");

  if (error) {
    console.error("[directory] verifiedProfileIds:", error.message);
    return new Set();
  }

  return new Set((data ?? []) as string[]);
});

function toArtist(row: ArtistRow, verified: Set<string>): PublicArtist {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    genre: row.genre,
    spotifyUrl: row.spotify_url,
    bio: row.bio,
    epkPhotoUrl: row.epk_photo_url,
    epkRider: row.epk_rider,
    epkContact: row.epk_contact,
    links: {
      website: row.website_url,
      instagram: row.instagram_url,
      facebook: row.facebook_url,
      tiktok: row.tiktok_url,
      youtube: row.youtube_url,
      soundcloud: row.soundcloud_url,
      bandcamp: row.bandcamp_url,
      linktree: row.linktree_url,
      spotify: row.spotify_url,
    },
    claimed: row.profile_id !== null,
    profileId: row.profile_id,
    verified: row.profile_id !== null && verified.has(row.profile_id),
  };
}

function toVenue(row: VenueRow, verified: Set<string>): PublicVenue {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    address: row.address,
    website: row.website,
    links: {
      website: row.website,
      instagram: row.instagram_url,
      facebook: row.facebook_url,
      tiktok: row.tiktok_url,
      youtube: row.youtube_url,
      soundcloud: row.soundcloud_url,
      bandcamp: row.bandcamp_url,
      linktree: row.linktree_url,
      spotify: null,
    },
    latitude: row.latitude,
    longitude: row.longitude,
    capacity: row.capacity,
    claimed: row.profile_id !== null,
    profileId: row.profile_id,
    verified: row.profile_id !== null && verified.has(row.profile_id),
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
  // La città si confronta sulla chiave normalizzata: "Milano", "milano" e
  // "Milano (MI)" sono la stessa città (migration `0024`).
  const city = filters.city ? cityKey(filters.city) : null;
  if (city) query = query.eq("city_key", city);
  if (filters.genre) query = query.eq("genre", filters.genre);

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + perPage - 1);

  if (error) {
    console.error("[directory] listArtists:", error.message);
    return { items: [], total: 0 };
  }

  const verified = await verifiedProfileIds();
  const rows = data as unknown as ArtistRow[];

  return { items: rows.map((row) => toArtist(row, verified)), total: count ?? 0 };
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
  const city = filters.city ? cityKey(filters.city) : null;
  if (city) query = query.eq("city_key", city);

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + perPage - 1);

  if (error) {
    console.error("[directory] listVenues:", error.message);
    return { items: [], total: 0 };
  }

  const verified = await verifiedProfileIds();
  const rows = data as unknown as VenueRow[];

  return { items: rows.map((row) => toVenue(row, verified)), total: count ?? 0 };
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

/**
 * Le città da mettere nel menu: **una voce per città vera**.
 *
 * Prima erano i valori distinti così com'erano scritti, quindi "Milano" e
 * "milano" erano due voci e ognuna trovava metà delle schede. Ora si raggruppa
 * per chiave normalizzata e si mostra la forma scritta più spesso.
 */
async function listCities(table: "artists" | "venues"): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(table)
    .select("city")
    .not("city", "is", null)
    .order("city", { ascending: true })
    .limit(2000);

  if (error) {
    console.error(`[directory] listCities ${table}:`, error.message);
    return [];
  }

  const groups = new Map<string, string[]>();

  for (const row of data as Array<{ city: string | null }>) {
    if (!row.city) continue;

    const key = cityKey(row.city);
    if (!key) continue;

    groups.set(key, [...(groups.get(key) ?? []), row.city]);
  }

  return [...groups.values()]
    .map((values) => preferredCityLabel(values))
    .filter((label): label is string => label !== null)
    .sort((a, b) => a.localeCompare(b));
}

export function listArtistCities(): Promise<string[]> {
  return listCities("artists");
}

export function listArtistGenres(): Promise<string[]> {
  return listDistinct("artists", "genre");
}

export function listVenueCities(): Promise<string[]> {
  return listCities("venues");
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

  return toArtist(data as unknown as ArtistRow, await verifiedProfileIds());
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

  return toVenue(data as unknown as VenueRow, await verifiedProfileIds());
});

/**
 * La propria scheda, cercata per profilo. Serve alla pagina dell'account, dove
 * la RLS lascia comunque leggere solo ciò che è proprio o già pubblico.
 */
export const getArtistByProfileId = cache(
  async (profileId: string): Promise<PublicArtist | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("artists")
      .select(ARTIST_SELECT)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("[directory] getArtistByProfileId:", error.message);
      return null;
    }

    return toArtist(data as unknown as ArtistRow, await verifiedProfileIds());
  }
);

export const getVenueByProfileId = cache(
  async (profileId: string): Promise<PublicVenue | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("venues")
      .select(VENUE_SELECT)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("[directory] getVenueByProfileId:", error.message);
      return null;
    }

    return toVenue(data as unknown as VenueRow, await verifiedProfileIds());
  }
);
