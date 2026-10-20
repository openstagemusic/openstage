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
  slug: string;
  name: string;
  city: string | null;
};

export type EventVenue = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  website: string | null;
};

/** Evento pubblico già normalizzato (embed di artista e locale inclusi). */
export type PublicEvent = {
  id: string;
  /** Pezzo finale dell'indirizzo pubblico (`/eventi/<citta>/<slug>`). */
  slug: string;
  title: string;
  description: string | null;
  startsAt: string;
  timezone: string;
  city: string | null;
  /** Come arrivare, per gli spazi che un indirizzo non ce l'hanno. */
  directionsText: string | null;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: LocationPrecision;
  areaRadiusM: number | null;
  genre: string | null;
  kind: EventKind;
  isFree: boolean;
  ticketUrl: string | null;
  /** Prezzo in testo libero: si mostra solo quando `isFree` è falso. */
  priceText: string | null;
  /** Nome del locale senza scheda su OpenStage (quando `venue` è nullo). */
  venueName: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  /** L'ha inserito OpenStage e nessuna delle schede collegate è stata reclamata. */
  isUnclaimed: boolean;
  /**
   * Lo stato della serata.
   *
   * `published` è l'unico che compare negli elenchi, nella mappa e nella Home:
   * `cancelled` esiste ancora **solo** per la sua pagina (che resta raggiungibile
   * con l'etichetta "Annullato") e per i Preferiti, che lo mostrano marcato.
   */
  status: "draft" | "published" | "cancelled";
  /** Quando è stata annullata (`null` se non lo è). */
  cancelledAt: string | null;
  /** Perché è stata annullata, se chi l'ha annullata l'ha scritto. */
  cancelReason: string | null;
  /**
   * Se valorizzata, questa scheda è un **doppione unito** a un'altra: la pagina
   * rimanda alla destinazione, non mostra la serata due volte.
   */
  mergedInto: string | null;
  artist: EventArtist | null;
  venue: EventVenue | null;
};

/** La serata è stata annullata: la pagina lo dice, gli elenchi non la mostrano. */
export function isCancelled(event: PublicEvent): boolean {
  return event.status === "cancelled";
}

/**
 * Il nome del posto dove si tiene la serata: la scheda del locale se esiste,
 * altrimenti quello che ha scritto chi ha creato l'evento. Serve a non ripetere
 * la stessa scelta in ogni elenco.
 */
export function placeName(event: PublicEvent): string | null {
  return event.venue?.name ?? event.venueName ?? null;
}

/** Un evento è posizionabile sulla mappa solo se ha coordinate reali. */
export function hasCoordinates(
  event: PublicEvent
): event is PublicEvent & { latitude: number; longitude: number } {
  return typeof event.latitude === "number" && typeof event.longitude === "number";
}

/**
 * Molti eventi hanno come titolo ufficiale il solo nome dell'artista (è la
 * convenzione delle prevendite): in quel caso ripeterlo sotto il titolo è
 * rumore, quindi la riga artista si mostra solo quando aggiunge informazione.
 */
export function artistRepeatsTitle(event: PublicEvent): boolean {
  if (!event.artist) return false;
  return event.artist.name.trim().toLowerCase() === event.title.trim().toLowerCase();
}
