import { cityKey } from "./city";
import { reverseLookup, searchPlaces, type GeocodePlace } from "./geocoder";

/**
 * Il controllo della posizione di una serata.
 *
 * Tre domande, in ordine, e ognuna con la sua risposta:
 *
 * 1. **Quel punto esiste?** La geocodifica inversa su mare aperto non restituisce
 *    niente: un concerto in mezzo al Tirreno non è un errore di distrazione, è
 *    un pin sbagliato.
 * 2. **La città scritta e il pin sono d'accordo?** Si confronta la città
 *    dichiarata con il punto: oltre 50 km è un avviso, oltre 300 km è un
 *    rifiuto. Un "Milano" con il pin a Berlino è quasi sempre un pin rimasto
 *    dov'era.
 * 3. **Il servizio risponde?** Se Photon è giù non si blocca nessuno: si
 *    lascia passare e si dice che il controllo non è stato fatto.
 *
 * I due limiti sono scelte di prodotto, non misure: 50 km è "un'altra città",
 * 300 km è "un altro paese". Stanno qui, in un posto solo, così l'avviso e il
 * blocco non possono divergere.
 */

export const NEAR_CITY_KM = 50;
export const WRONG_CITY_KM = 300;

/**
 * Quanto può aspettare chi salva.
 *
 * Il controllo è un aiuto, non una condizione del salvataggio: se Photon è lento
 * si lascia passare (status `unavailable`) invece di tenere l'utente davanti a
 * una rotella. Chi vuole il parere completo lo chiede dalla rotta `/api/geocode`,
 * che ha più tempo.
 */
export const SAVE_CHECK_TIMEOUT_MS = 3000;

export type LocationCheckStatus = "ok" | "far" | "impossible" | "empty" | "unavailable";

export type LocationCheck = {
  status: LocationCheckStatus;
  /** Quanto dista il pin dalla città dichiarata. `null` se non si è potuto misurare. */
  distanceKm: number | null;
  /** Che posto c'è sotto il pin, secondo OpenStreetMap. */
  place: GeocodePlace | null;
};

/** Distanza in linea d'aria (formula dell'emisenoverso). */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const earthRadiusKm = 6371.0088;
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

/** La città dichiarata, cercata sul geocodificatore. */
async function lookupCity(
  city: string,
  locale: string,
  timeoutMs?: number
): Promise<GeocodePlace | null> {
  const places = await searchPlaces(city, { locale, timeoutMs });
  if (places.length === 0) return null;

  // Photon ordina per rilevanza, non per distanza: fra i risultati si preferisce
  // quello che si chiama davvero come la città scritta.
  const key = cityKey(city);
  const sameName = places.find((place) => cityKey(place.city ?? place.name) === key);

  return sameName ?? places[0] ?? null;
}

export async function checkEventLocation(input: {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  locale: string;
  /** Quanto aspettare il geocodificatore. Chi salva può concedere meno. */
  timeoutMs?: number;
}): Promise<LocationCheck> {
  const { latitude, longitude } = input;

  if (
    latitude === null ||
    longitude === null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return { status: "ok", distanceKm: null, place: null };
  }

  const reverse = await reverseLookup(latitude, longitude, {
    locale: input.locale,
    timeoutMs: input.timeoutMs,
  });

  if (reverse.status === "unavailable") {
    return { status: "unavailable", distanceKm: null, place: null };
  }

  if (reverse.status === "empty") {
    return { status: "empty", distanceKm: null, place: null };
  }

  const place = reverse.place;
  const city = input.city?.trim() ?? "";

  if (city === "") {
    return { status: "ok", distanceKm: null, place };
  }

  const cityPlace = await lookupCity(city, input.locale, input.timeoutMs);

  // Città non trovata: non si inventa una distanza. Il pin resta com'è.
  if (!cityPlace) {
    return { status: "ok", distanceKm: null, place };
  }

  const distanceKm = Math.round(
    haversineKm(
      { latitude, longitude },
      { latitude: cityPlace.latitude, longitude: cityPlace.longitude }
    )
  );

  if (distanceKm > WRONG_CITY_KM) {
    return { status: "impossible", distanceKm, place };
  }

  if (distanceKm > NEAR_CITY_KM) {
    return { status: "far", distanceKm, place };
  }

  return { status: "ok", distanceKm, place };
}
