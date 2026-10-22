import { cityKey } from "@/lib/geo/city";
import { slugify } from "@/lib/slug";

/**
 * Indirizzo pubblico di una città.
 *
 * Lo slug parte dalla stessa chiave dei filtri, non dal testo grezzo: "Milano
 * (MI)" e "milano" devono portare entrambe a `/citta/milano`. La provincia fra
 * parentesi è rumore anche nell'indirizzo.
 */
export function cityPath(city: string): string {
  return `/citta/${slugify(cityKey(city) ?? city)}`;
}
