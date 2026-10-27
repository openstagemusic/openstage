import { isEventPast } from "@/lib/events/format";
import { createClient } from "@/lib/supabase/server";

/**
 * Qualità dei dati, senza AI.
 *
 * Questa lettura non corregge nulla: trova le righe che meritano un controllo
 * umano. I confronti sui doppioni sono deterministici (nome normalizzato,
 * città per i locali, titolo e giorno per gli eventi), così il risultato è
 * spiegabile e non costa una chiamata al modello.
 */

export type EventQualityIssue =
  | "noCity"
  | "noPage"
  | "pastPublished"
  | "noCover"
  | "noPrice"
  | "suspiciousDate"
  | "duplicate";

export type PageQualityIssue =
  | "noCity"
  | "noGenre"
  | "noBio"
  | "noSpotify"
  | "noAddress"
  | "noCoords"
  | "noWebsite"
  | "noEvents"
  | "freePage"
  | "duplicate";

export type QualityEvent = {
  id: string;
  title: string;
  startsAt: string;
  timezone: string;
  status: "draft" | "published" | "cancelled";
  city: string | null;
  venueName: string | null;
  artistName: string | null;
  issues: EventQualityIssue[];
};

export type QualityPage = {
  id: string;
  kind: "artist" | "venue";
  name: string;
  city: string | null;
  slug: string | null;
  profileId: string | null;
  issues: PageQualityIssue[];
};

export type DuplicatePair = {
  kind: "artist" | "venue" | "event";
  idA: string;
  idB: string;
  nameA: string;
  nameB: string;
  /** Città per le schede, giorno ISO per gli eventi. */
  detail: string | null;
};

export type DataQualityReport = {
  events: QualityEvent[];
  artists: QualityPage[];
  venues: QualityPage[];
  duplicates: DuplicatePair[];
};

/** Le liste sono code di lavoro, non tabelle complete: oltre non serve. */
const MAX_ROWS = 500;

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  timezone: string;
  status: "draft" | "published" | "cancelled";
  city: string | null;
  venue_name: string | null;
  cover_image_url: string | null;
  price_text: string | null;
  artist_id: string | null;
  venue_id: string | null;
  artists: { name: string } | null;
  venues: { name: string } | null;
};

type ArtistRow = {
  id: string;
  name: string;
  city: string | null;
  genre: string | null;
  bio: string | null;
  spotify_url: string | null;
  slug: string | null;
  profile_id: string | null;
};

type VenueRow = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  slug: string | null;
  profile_id: string | null;
};

const LEADING_ARTICLE = /^(il|lo|la|i|gli|le|l|the)\s+/;

/** Minuscole, accenti, punteggiatura e articolo iniziale non contano. */
function normalizeName(value: string | null): string {
  if (!value) return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(LEADING_ARTICLE, "")
    .replace(/\s+/g, " ");
}

function isSuspiciousDate(value: string, now: Date): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;

  const year = date.getUTCFullYear();
  const twoYears = now.getTime() + 2 * 365 * 86_400_000;

  return year < 2000 || date.getTime() > twoYears;
}

function findSimilarPairs<T>(
  items: T[],
  kind: "artist" | "venue",
  getId: (item: T) => string,
  getName: (item: T) => string | null,
  getCity: (item: T) => string | null,
  requireSameCity: boolean
): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const nameA = normalizeName(getName(items[i]));
    if (!nameA) continue;

    for (let j = i + 1; j < items.length; j += 1) {
      const nameB = normalizeName(getName(items[j]));
      if (!nameB) continue;

      const same = nameA === nameB;
      const short = nameA.length <= nameB.length ? nameA : nameB;
      const long = nameA.length <= nameB.length ? nameB : nameA;
      // Un nome contenuto in un altro è un'indicazione, non una condanna:
      // "Druso" e "Druso Live Club" possono essere la stessa sala.
      const contained = short.length >= 5 && long.includes(short);

      if (!same && !contained) continue;

      if (requireSameCity) {
        const cityA = normalizeName(getCity(items[i]));
        const cityB = normalizeName(getCity(items[j]));
        if (cityA && cityB && cityA !== cityB) continue;
      }

      const cityA = getCity(items[i]);
      const cityB = getCity(items[j]);
      const detail =
        cityA && cityB && normalizeName(cityA) !== normalizeName(cityB)
          ? `${cityA} / ${cityB}`
          : cityA ?? cityB ?? null;

      pairs.push({
        kind,
        idA: getId(items[i]),
        idB: getId(items[j]),
        nameA: getName(items[i]) ?? "",
        nameB: getName(items[j]) ?? "",
        detail,
      });
    }
  }

  return pairs;
}

/**
 * Due eventi sono sospetti se hanno lo stesso titolo, lo stesso giorno e lo
 * stesso locale/città. Senza quest'ultimo controllo, dieci "Live" nello stesso
 * giorno sembrerebbero tutti duplicati.
 */
function findEventPairs(events: EventRow[]): DuplicatePair[] {
  const groups = new Map<string, EventRow[]>();

  for (const event of events) {
    const title = normalizeName(event.title);
    if (!title) continue;

    const place = normalizeName(event.venues?.name ?? event.venue_name ?? event.city);
    const key = `${title}|${event.starts_at.slice(0, 10)}|${place}`;
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }

  const pairs: DuplicatePair[] = [];

  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        pairs.push({
          kind: "event",
          idA: group[i].id,
          idB: group[j].id,
          nameA: group[i].title,
          nameB: group[j].title,
          detail: group[i].starts_at,
        });
      }
    }
  }

  return pairs;
}

function pageIdsWithEvents(events: EventRow[]): {
  artists: Set<string>;
  venues: Set<string>;
} {
  const artists = new Set<string>();
  const venues = new Set<string>();

  for (const event of events) {
    if (event.artist_id) artists.add(event.artist_id);
    if (event.venue_id) venues.add(event.venue_id);
  }

  return { artists, venues };
}

export async function getDataQualityReport(): Promise<DataQualityReport> {
  const supabase = await createClient();
  const now = new Date();

  const [eventsResult, artistsResult, venuesResult] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, starts_at, timezone, status, city, venue_name, cover_image_url, " +
          "price_text, artist_id, venue_id, artists ( name ), venues ( name )"
      )
      .order("starts_at", { ascending: false })
      .limit(MAX_ROWS),
    supabase
      .from("artists")
      .select("id, name, city, genre, bio, spotify_url, slug, profile_id")
      .order("name", { ascending: true })
      .limit(MAX_ROWS),
    supabase
      .from("venues")
      .select("id, name, city, address, latitude, longitude, website, slug, profile_id")
      .order("name", { ascending: true })
      .limit(MAX_ROWS),
  ]);

  if (eventsResult.error) console.error("[admin] quality events:", eventsResult.error.message);
  if (artistsResult.error) console.error("[admin] quality artists:", artistsResult.error.message);
  if (venuesResult.error) console.error("[admin] quality venues:", venuesResult.error.message);

  const eventRows = (eventsResult.data as unknown as EventRow[] | null) ?? [];
  const artistRows = (artistsResult.data as unknown as ArtistRow[] | null) ?? [];
  const venueRows = (venuesResult.data as unknown as VenueRow[] | null) ?? [];

  const used = pageIdsWithEvents(eventRows);

  const artistPairs = findSimilarPairs(
    artistRows,
    "artist",
    (row) => row.id,
    (row) => row.name,
    (row) => row.city,
    false
  );
  const venuePairs = findSimilarPairs(
    venueRows,
    "venue",
    (row) => row.id,
    (row) => row.name,
    (row) => row.city,
    true
  );
  const eventPairs = findEventPairs(eventRows);

  const duplicateIds = new Set<string>();
  for (const pair of [...artistPairs, ...venuePairs, ...eventPairs]) {
    duplicateIds.add(`${pair.kind}:${pair.idA}`);
    duplicateIds.add(`${pair.kind}:${pair.idB}`);
  }

  const events: QualityEvent[] = eventRows
    .map((row) => {
      const issues: EventQualityIssue[] = [];

      if (!row.city?.trim()) issues.push("noCity");
      if (!row.artist_id && !row.venue_id) issues.push("noPage");
      if (row.status === "published" && isEventPast(row.starts_at, row.timezone, now)) {
        issues.push("pastPublished");
      }
      if (!row.cover_image_url) issues.push("noCover");
      if (!row.price_text?.trim()) issues.push("noPrice");
      if (isSuspiciousDate(row.starts_at, now)) issues.push("suspiciousDate");
      if (duplicateIds.has(`event:${row.id}`)) issues.push("duplicate");

      return {
        id: row.id,
        title: row.title,
        startsAt: row.starts_at,
        timezone: row.timezone,
        status: row.status,
        city: row.city,
        venueName: row.venues?.name ?? row.venue_name,
        artistName: row.artists?.name ?? null,
        issues,
      };
    })
    .filter((event) => event.issues.length > 0);

  const artists: QualityPage[] = artistRows
    .map((row) => {
      const issues: PageQualityIssue[] = [];

      if (!row.city?.trim()) issues.push("noCity");
      if (!row.genre?.trim()) issues.push("noGenre");
      if (!row.bio?.trim()) issues.push("noBio");
      if (!row.spotify_url?.trim()) issues.push("noSpotify");
      if (!used.artists.has(row.id)) issues.push("noEvents");
      if (!row.profile_id) issues.push("freePage");
      if (duplicateIds.has(`artist:${row.id}`)) issues.push("duplicate");

      return {
        id: row.id,
        kind: "artist" as const,
        name: row.name,
        city: row.city,
        slug: row.slug,
        profileId: row.profile_id,
        issues,
      };
    })
    .filter((artist) => artist.issues.length > 0);

  const venues: QualityPage[] = venueRows
    .map((row) => {
      const issues: PageQualityIssue[] = [];

      if (!row.city?.trim()) issues.push("noCity");
      if (!row.address?.trim()) issues.push("noAddress");
      if (row.latitude === null || row.longitude === null) issues.push("noCoords");
      if (!row.website?.trim()) issues.push("noWebsite");
      if (!used.venues.has(row.id)) issues.push("noEvents");
      if (!row.profile_id) issues.push("freePage");
      if (duplicateIds.has(`venue:${row.id}`)) issues.push("duplicate");

      return {
        id: row.id,
        kind: "venue" as const,
        name: row.name,
        city: row.city,
        slug: row.slug,
        profileId: row.profile_id,
        issues,
      };
    })
    .filter((venue) => venue.issues.length > 0);

  return {
    events,
    artists,
    venues,
    duplicates: [...artistPairs, ...venuePairs, ...eventPairs],
  };
}
