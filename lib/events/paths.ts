import { slugify } from "@/lib/slug";

/**
 * Indirizzi pubblici, in un posto solo.
 *
 * Restano **senza prefisso di lingua**: il middleware è l'unico che decide
 * `/it/…` o `/en/…`, quindi qui si scrive sempre l'indirizzo "nudo".
 */

type EventPathInput = {
  id: string;
  slug: string;
  city: string | null;
};

/**
 * Indirizzo canonico di un evento: `/eventi/<citta>/<slug>`.
 *
 * La città fa parte dell'indirizzo perché dice subito dove si suona. Se manca
 * (evento inserito senza città) si resta sull'indirizzo per identificativo:
 * meglio un indirizzo lungo che uno sbagliato.
 */
export function eventPath(event: EventPathInput): string {
  const city = event.city ? slugify(event.city) : "";
  return city ? `/eventi/${city}/${event.slug}` : `/eventi/${event.id}`;
}

/** Segmento città di un indirizzo evento, per verificarne la coerenza. */
export function citySegment(city: string | null): string {
  return city ? slugify(city) : "";
}

export function artistPath(artist: { slug: string }): string {
  return `/artisti/${artist.slug}`;
}

export function venuePath(venue: { slug: string }): string {
  return `/locali/${venue.slug}`;
}
