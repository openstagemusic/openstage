/** Tipi condivisi fra server e client per gli eventi pubblici. */

export type EventKind =
  | "concert"
  | "dj_set"
  | "festival"
  | "open_mic"
  | "acoustic"
  | "other";

export type LocationPrecision = "exact" | "approximate";

export const EVENT_KINDS: EventKind[] = [
  "concert",
  "dj_set",
  "festival",
  "open_mic",
  "acoustic",
  "other",
];

export type EventArtist = {
  id: string;
  name: string;
  city: string | null;
};

export type EventVenue = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
};

/** Evento pubblico già normalizzato (embed di artista e locale inclusi). */
export type PublicEvent = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  timezone: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: LocationPrecision;
  areaRadiusM: number | null;
  genre: string | null;
  kind: EventKind;
  isFree: boolean;
  ticketUrl: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  isUnclaimed: boolean;
  artist: EventArtist | null;
  venue: EventVenue | null;
};

/** Un evento è posizionabile sulla mappa solo se ha coordinate reali. */
export function hasCoordinates(
  event: PublicEvent
): event is PublicEvent & { latitude: number; longitude: number } {
  return typeof event.latitude === "number" && typeof event.longitude === "number";
}
