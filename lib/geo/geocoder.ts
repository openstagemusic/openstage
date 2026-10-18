import { createClient } from "@/lib/supabase/server";

/**
 * Ricerca di luoghi: dal nome di una città (o di un indirizzo) alle coordinate,
 * così la mappa dell'editor si sposta dove si tiene davvero la serata.
 *
 * La fonte è **Photon** (komoot), un geocodificatore aperto su dati
 * OpenStreetMap: nessuna chiave, nessun account, nessun costo. Il servizio è
 * pubblico e chiede un uso ragionevole, quindi:
 *   - si chiama solo da qui (lato server), mai dal browser;
 *   - la risposta si salva in `geocode_cache`, e la stessa ricerca non si
 *     ripete (una città cercata due volte costa una chiamata sola);
 *   - l'indirizzo del servizio sta in `GEOCODER_URL`, così passare a un Photon
 *     self-hosted è una variabile d'ambiente, non una riscrittura.
 *
 * Se il servizio non risponde, l'elenco torna vuoto e l'editor resta usabile:
 * la città si scrive a mano e il pin si mette sulla mappa.
 */

export type GeocodePlace = {
  /** Identificativo stabile del posto su OpenStreetMap. */
  id: string;
  /** Nome leggibile ("Ranica", "Via Roma 12", "Stadio Druso"). */
  name: string;
  /** Dove siamo: "Bergamo · Lombardia · Italia". */
  detail: string;
  /**
   * La città da scrivere in `events.city`: per un indirizzo è il comune, per una
   * città è la città stessa. `null` quando OpenStreetMap non lo dice.
   */
  city: string | null;
  latitude: number;
  longitude: number;
  /** Con che ingrandimento mostrare il posto sulla mappa. */
  zoom: number;
};

const DEFAULT_GEOCODER_URL = "https://photon.komoot.io";
const SEARCH_LIMIT = 6;
const REQUEST_TIMEOUT_MS = 5000;
/** Dopo questo tempo la ricerca si rifà: i nomi dei posti cambiano, lentamente. */
const CACHE_MAX_AGE_DAYS = 90;

/**
 * Risultati che non ci servono: un torrente o un bosco che porta il nome del
 * paese non è un posto dove si suona.
 */
const IGNORED_OSM_KEYS = new Set(["natural", "waterway", "water", "landuse", "railway", "route"]);

type PhotonProperties = Record<string, unknown>;

type PhotonFeature = {
  properties?: PhotonProperties;
  geometry?: { coordinates?: unknown };
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** "place=city" + "type=city" → una stringa sola, più comoda da leggere. */
function shape(properties: PhotonProperties): string {
  return `${text(properties.osm_value) ?? ""} ${text(properties.type) ?? ""}`.trim().toLowerCase();
}

function placeName(properties: PhotonProperties): string | null {
  const name = text(properties.name);
  if (name) return name;

  // Un indirizzo spesso non ha nome: si compone dalla via e dal civico.
  const street = text(properties.street);
  if (street) {
    const number = text(properties.housenumber);
    return number ? `${street} ${number}` : street;
  }

  return text(properties.city);
}

/** "Verona · Veneto · Italia": senza ripetere lo stesso valore due volte. */
function placeDetail(properties: PhotonProperties): string {
  const values = [
    text(properties.city),
    text(properties.county),
    text(properties.state),
    text(properties.country),
  ].filter((value): value is string => value !== null);

  return [...new Set(values)].join(" · ");
}

function placeCity(properties: PhotonProperties, name: string): string | null {
  const city = text(properties.city);
  if (city) return city;

  // Il risultato *è* la città (o il paese): il comune è il suo stesso nome.
  return /\b(city|town|village|hamlet|municipality)\b/.test(shape(properties)) ? name : null;
}

function placeZoom(properties: PhotonProperties): number {
  const shape_ = shape(properties);

  if (text(properties.osm_key) === "boundary" || /\b(country|state|region|province)\b/.test(shape_)) {
    return 9;
  }

  if (/\b(city|town|municipality)\b/.test(shape_)) return 12;
  if (/\b(village|hamlet|suburb|neighbourhood|district|borough|quarter)\b/.test(shape_)) return 14;

  // Indirizzi, strade, locali e altri punti: da vicino.
  return 16;
}

function toPlace(feature: PhotonFeature, index: number): GeocodePlace | null {
  const properties = feature?.properties ?? {};

  const osmKey = text(properties.osm_key);
  if (osmKey && IGNORED_OSM_KEYS.has(osmKey)) return null;

  const coordinates = feature?.geometry?.coordinates;
  const longitude = Array.isArray(coordinates) ? Number(coordinates[0]) : Number.NaN;
  const latitude = Array.isArray(coordinates) ? Number(coordinates[1]) : Number.NaN;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  const name = placeName(properties);
  if (!name) return null;

  const osmType = text(properties.osm_type) ?? "x";
  const osmId = properties.osm_id != null ? String(properties.osm_id) : String(index);

  return {
    id: `${osmType}-${osmId}`,
    name,
    detail: placeDetail(properties),
    city: placeCity(properties, name),
    latitude,
    longitude,
    zoom: placeZoom(properties),
  };
}

/** Toglie i doppioni ("Ranica" arriva due volte: comune e paese). */
function toPlaces(features: PhotonFeature[]): GeocodePlace[] {
  const seen = new Set<string>();
  const places: GeocodePlace[] = [];

  for (const [index, feature] of features.entries()) {
    const place = toPlace(feature, index);
    if (!place) continue;

    const key = `${place.name}|${place.detail}`;
    if (seen.has(key)) continue;

    seen.add(key);
    places.push(place);
  }

  return places.slice(0, SEARCH_LIMIT);
}

/**
 * Photon accetta `lang` solo per tedesco, inglese e francese: l'italiano sono i
 * nomi locali, che è esattamente quello che serve. Per l'inglese lo chiediamo.
 */
function languageParam(locale: string): string {
  return locale === "en" ? "&lang=en" : "";
}

async function askPhoton(path: string): Promise<PhotonFeature[]> {
  const base = (process.env.GEOCODER_URL?.trim() || DEFAULT_GEOCODER_URL).replace(/\/+$/, "");

  try {
    const response = await fetch(`${base}${path}`, {
      headers: {
        accept: "application/json",
        // Un servizio pubblico vuole sapere chi lo sta chiamando.
        "user-agent": "OpenStage/0.1 (+https://openstage-alpha.vercel.app)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error("[geo] Photon ha risposto", response.status);
      return [];
    }

    const payload = (await response.json()) as { features?: PhotonFeature[] };
    return Array.isArray(payload.features) ? payload.features : [];
  } catch (error) {
    console.error("[geo] Photon non raggiungibile:", error instanceof Error ? error.message : error);
    return [];
  }
}

/** Un posto salvato in cache vale solo se ha la forma giusta. */
function isPlace(value: unknown): value is GeocodePlace {
  if (typeof value !== "object" || value === null) return false;

  const place = value as Partial<GeocodePlace>;

  return (
    typeof place.id === "string" &&
    typeof place.name === "string" &&
    typeof place.detail === "string" &&
    (place.city === null || typeof place.city === "string") &&
    typeof place.latitude === "number" &&
    Number.isFinite(place.latitude) &&
    typeof place.longitude === "number" &&
    Number.isFinite(place.longitude) &&
    typeof place.zoom === "number"
  );
}

function cacheKey(query: string): string {
  return query.toLowerCase();
}

async function readCached(canonical: string): Promise<GeocodePlace[] | null> {
  const supabase = await createClient();
  const oldest = new Date(Date.now() - CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("geocode_cache")
    .select("results")
    .eq("query", canonical)
    .gt("created_at", oldest)
    .maybeSingle();

  if (error) {
    console.error("[geo] lettura cache:", error.message);
    return null;
  }

  if (!data) return null;

  const results = (data as { results: unknown }).results;
  const places = Array.isArray(results) ? results.filter(isPlace) : [];

  return places.length > 0 ? places : null;
}

async function writeCached(canonical: string, places: GeocodePlace[]): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("cache_geocode", {
    p_query: canonical,
    p_results: places,
  });

  if (error) console.error("[geo] scrittura cache:", error.message);
}

/**
 * Cerca città, indirizzi e locali.
 *
 * La cache è per sola ricerca: è la stessa per tutti, quindi non tiene conto di
 * dove si trova chi scrive (Photon ordinerebbe i risultati anche in base alla
 * posizione). Meglio una risposta uguale per tutti che una cache inutilizzabile.
 */
export async function searchPlaces(
  query: string,
  options: { locale: string }
): Promise<GeocodePlace[]> {
  const term = query.trim().slice(0, 120);
  if (term.length < 3) return [];

  const canonical = cacheKey(term);

  const cached = await readCached(canonical);
  if (cached) return cached;

  const features = await askPhoton(
    `/api?q=${encodeURIComponent(term)}&limit=${SEARCH_LIMIT}${languageParam(options.locale)}`
  );

  const places = toPlaces(features);

  // Si salva solo una risposta vera: un servizio momentaneamente giù non deve
  // diventare "questo posto non esiste" per i prossimi novanta giorni.
  if (places.length > 0) await writeCached(canonical, places);

  return places;
}

/**
 * Che posto è questo punto? Serve a riempire la città quando il pin si trascina
 * e il campo è vuoto.
 *
 * Nessuna cache qui: le coordinate cambiano a ogni trascinamento, salvarle
 * significherebbe riempire la tabella di righe che non serviranno mai più.
 */
export async function reversePlace(
  latitude: number,
  longitude: number,
  options: { locale: string }
): Promise<GeocodePlace | null> {
  const features = await askPhoton(
    `/reverse?lat=${latitude}&lon=${longitude}&limit=1${languageParam(options.locale)}`
  );

  return toPlaces(features)[0] ?? null;
}
