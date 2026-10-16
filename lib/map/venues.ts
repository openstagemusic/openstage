/**
 * Raggruppamento degli eventi per locale.
 *
 * Tre concerti nella stessa sala condividono le stesse coordinate: senza questo
 * passaggio finirebbero in tre pin perfettamente sovrapposti e solo l'ultimo
 * sarebbe cliccabile. Qui diventano **un punto solo** con il numero delle
 * serate, e la scheda del punto elenca le date.
 */

import { hasCoordinates, type PublicEvent } from "@/lib/events/types";

export type VenueGroup = {
  /** Chiave del punto: `venue:<id>` oppure le coordinate esatte. */
  key: string;
  longitude: number;
  latitude: number;
  venueId: string | null;
  venueName: string | null;
  city: string | null;
  /** Serate del locale, in ordine di data (l'elenco arriva già ordinato). */
  events: PublicEvent[];
};

/** Cosa sta mostrando la mappa: una serata o tutte le serate di un locale. */
export type MapSelection =
  | { type: "event"; event: PublicEvent }
  | { type: "venue"; group: VenueGroup };

function keyOf(event: PublicEvent & { latitude: number; longitude: number }): string {
  if (event.venue?.id) return `venue:${event.venue.id}`;

  // Senza locale collegato, il punto è la posizione: cinque decimali (~1 m)
  // bastano a unire le serate che si svolgono davvero nello stesso posto.
  return `point:${event.latitude.toFixed(5)},${event.longitude.toFixed(5)}`;
}

export function groupEventsByVenue(events: PublicEvent[]): VenueGroup[] {
  const groups = new Map<string, VenueGroup>();

  for (const event of events) {
    if (!hasCoordinates(event)) continue;

    const key = keyOf(event);
    const existing = groups.get(key);

    if (existing) {
      existing.events.push(event);
      continue;
    }

    groups.set(key, {
      key,
      longitude: event.longitude,
      latitude: event.latitude,
      venueId: event.venue?.id ?? null,
      venueName: event.venue?.name ?? null,
      city: event.city ?? event.venue?.city ?? null,
      events: [event],
    });
  }

  return [...groups.values()];
}
