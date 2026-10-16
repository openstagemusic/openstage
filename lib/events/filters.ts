/**
 * Filtri di scoperta: dalla URL ai parametri di query, e ritorno.
 *
 * Tutto vive in `searchParams`, così una ricerca è condivisibile e la pagina
 * resta renderizzata dal server (SEO e anteprime social comprese).
 */

import { addDays, calendarDate, weekday, zonedInstant } from "./timezone";
import { EVENT_KINDS, type EventKind } from "./types";

export const WHEN_PRESETS = ["tonight", "weekend", "week", "month"] as const;
export type WhenPreset = (typeof WHEN_PRESETS)[number];

export const RADIUS_OPTIONS = [10, 25, 50, 100, 250] as const;
export type RadiusOption = (typeof RADIUS_OPTIONS)[number];

export type Center = { latitude: number; longitude: number };

export type DiscoveryFilters = {
  /** Ricerca libera (titolo, città, genere, artista, locale). */
  q: string | null;
  when: WhenPreset | null;
  genre: string | null;
  kind: EventKind | null;
  freeOnly: boolean;
  radiusKm: RadiusOption | null;
  /** Centro del filtro per raggio. */
  center: Center | null;
  page: number;
};

export const EMPTY_FILTERS: DiscoveryFilters = {
  q: null,
  when: null,
  genre: null,
  kind: null,
  freeOnly: false,
  radiusKm: null,
  center: null,
  page: 1,
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function isCenter(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/**
 * Legge i filtri dalla URL. Valori non riconosciuti vengono ignorati invece che
 * fatti passare: la URL è input dell'utente.
 */
export function parseDiscoveryFilters(
  raw: RawSearchParams,
  fallbackCenter: Center | null
): DiscoveryFilters {
  const whenRaw = single(raw.when);
  const kindRaw = single(raw.kind);

  const radiusRaw = Number.parseFloat(single(raw.radius) ?? "");
  const radiusKm = RADIUS_OPTIONS.find((option) => option === radiusRaw) ?? null;

  const latitude = Number.parseFloat(single(raw.lat) ?? "");
  const longitude = Number.parseFloat(single(raw.lng) ?? "");
  const urlCenter = isCenter(latitude, longitude) ? { latitude, longitude } : null;

  const pageRaw = Number.parseInt(single(raw.page) ?? "1", 10);

  return {
    q: single(raw.q)?.slice(0, 80) ?? null,
    when: WHEN_PRESETS.find((preset) => preset === whenRaw) ?? null,
    genre: single(raw.genre)?.slice(0, 60) ?? null,
    kind: EVENT_KINDS.find((item) => item === kindRaw) ?? null,
    freeOnly: single(raw.free) === "1",
    radiusKm,
    // Il raggio ha senso solo con un centro: se la URL non ce l'ha si ripiega
    // sulla posizione del visitatore (dai geo-header).
    center: radiusKm ? urlCenter ?? fallbackCenter : null,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

/**
 * Finestra temporale di un preset rapido, in ora locale del fuso di
 * riferimento.
 *
 * "Stasera" copre l'intera giornata odierna (non solo il futuro): un concerto
 * iniziato un'ora fa è ancora la serata di oggi, e gli eventi non hanno un'ora
 * di fine con cui escluderlo.
 */
export function presetRange(
  preset: WhenPreset,
  now: Date = new Date()
): { from: Date; to: Date } {
  const today = calendarDate(now);
  const startOfToday = zonedInstant(today);

  if (preset === "tonight") {
    return { from: startOfToday, to: zonedInstant(addDays(today, 1)) };
  }

  if (preset === "weekend") {
    const day = weekday(today);

    // Sabato e domenica il weekend è già iniziato.
    if (day === 6) return { from: startOfToday, to: zonedInstant(addDays(today, 2)) };
    if (day === 0) return { from: startOfToday, to: zonedInstant(addDays(today, 1)) };

    const saturday = addDays(today, 6 - day);
    return { from: zonedInstant(saturday), to: zonedInstant(addDays(saturday, 2)) };
  }

  if (preset === "week") {
    return { from: startOfToday, to: zonedInstant(addDays(today, 7)) };
  }

  return { from: startOfToday, to: zonedInstant(addDays(today, 30)) };
}

/** Filtri nella forma attesa dal livello di lettura (`lib/events/queries.ts`). */
export type EventQueryFilters = {
  query?: string | null;
  from?: string | null;
  to?: string | null;
  genre?: string | null;
  kind?: EventKind | null;
  freeOnly?: boolean;
  center?: Center | null;
  radiusKm?: number | null;
};

export function toQueryFilters(
  filters: DiscoveryFilters,
  now: Date = new Date()
): EventQueryFilters {
  const range = filters.when ? presetRange(filters.when, now) : null;

  return {
    query: filters.q,
    from: range ? range.from.toISOString() : null,
    to: range ? range.to.toISOString() : null,
    genre: filters.genre,
    kind: filters.kind,
    freeOnly: filters.freeOnly,
    center: filters.center,
    radiusKm: filters.radiusKm,
  };
}

export function hasActiveFilters(filters: DiscoveryFilters): boolean {
  return Boolean(
    filters.q ||
      filters.when ||
      filters.genre ||
      filters.kind ||
      filters.freeOnly ||
      filters.radiusKm
  );
}

/** Query string condivisibile a partire dai filtri correnti. */
export function discoveryQuery(
  filters: DiscoveryFilters,
  overrides: Partial<DiscoveryFilters> = {}
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (merged.q) params.set("q", merged.q);
  if (merged.when) params.set("when", merged.when);
  if (merged.genre) params.set("genre", merged.genre);
  if (merged.kind) params.set("kind", merged.kind);
  if (merged.freeOnly) params.set("free", "1");

  if (merged.radiusKm) {
    params.set("radius", String(merged.radiusKm));
    if (merged.center) {
      params.set("lat", merged.center.latitude.toFixed(4));
      params.set("lng", merged.center.longitude.toFixed(4));
    }
  }

  if (merged.page > 1) params.set("page", String(merged.page));

  return params.toString();
}
