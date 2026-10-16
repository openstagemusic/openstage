/**
 * Configurazione della mappa (MapLibre GL JS + OpenFreeMap).
 *
 * Tutto l'indirizzo del fornitore di tile vive qui: per passare a un altro
 * provider (MapTiler, tile self-hosted in PMTiles…) basta cambiare
 * `MAP_STYLE_URL`, senza toccare i componenti.
 *
 * OpenFreeMap: nessuna chiave API, nessun account, uso commerciale consentito,
 * dati OpenStreetMap. L'attribuzione è obbligatoria ed è già inclusa nello
 * stile caricato (il controllo attribuzioni di MapLibre la mostra).
 */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

/** Attribuzione di riserva, mostrata se lo stile non la fornisce. */
export const MAP_ATTRIBUTION =
  '© <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/** Percorso del worker di MapLibre (copiato in `public/` dagli script npm). */
export const MAP_WORKER_URL = "/maplibre-gl-worker.mjs";

/** Colori di marca usati dai layer della mappa. */
export const MAP_COLORS = {
  violet: "#8b5cf6",
  cyan: "#22d3ee",
  pink: "#f472b6",
  glow: "#c4b5fd",
  ink: "#07070d",
  inkSoft: "#0d0d1a",
} as const;

/** Centro di ripiego (Roma) quando non conosciamo la posizione del visitatore. */
export const DEFAULT_CENTER = { longitude: 12.4964, latitude: 41.9028 } as const;

/** Vista iniziale: il globo è visibile ma la zona dell'utente resta leggibile. */
export const DEFAULT_ZOOM = 4.5;

/** Zoom regionale usato quando conosciamo la zona del visitatore (header IP). */
export const REGION_ZOOM = 5.6;

/** Zoom usato quando centriamo sulla posizione reale del visitatore. */
export const LOCAL_ZOOM = 10.5;

/** Massimo numero di eventi caricati sulla mappa (protegge il client). */
export const MAX_MAP_EVENTS = 400;

/** Sotto questo zoom i pin sono raggruppati in cluster. */
export const CLUSTER_MAX_ZOOM = 10;

/**
 * Ingresso del globo: parte "girato" e si assesta sulla zona dell'utente.
 *
 * Una rotazione continua allontanerebbe la zona interessante dallo schermo
 * (oltre a consumare batteria e richieste di tile): così il globo gira una
 * volta sola, per pochi secondi, e poi lascia la vista sull'area giusta.
 */
export const INTRO_SPIN_DURATION = 4200;
export const INTRO_SPIN_LONGITUDE_OFFSET = 34;
export const INTRO_SPIN_LATITUDE_OFFSET = 10;
export const INTRO_SPIN_ZOOM_OFFSET = 1.2;
/** Zoom minimo della mappa a schermo intero. */
export const MIN_ZOOM = 1.2;
