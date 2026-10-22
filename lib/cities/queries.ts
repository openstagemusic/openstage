import { cache } from "react";

import { EVENT_SELECT, toPublicEvent, type EventRow } from "@/lib/events/queries";
import type { PublicEvent } from "@/lib/events/types";
import { cityKey, preferredCityLabel } from "@/lib/geo/city";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

/**
 * Le città pubbliche, lette dagli eventi reali.
 *
 * Non esiste un elenco di città nel codice: una città entra nell'indice quando
 * c'è almeno una serata **futura** pubblicata. La pagina città, però, resta
 * raggiungibile anche quando le serate sono finite: chi arriva da un vecchio
 * link trova lo stato vuoto e le schede di artisti e locali, non un 404. La
 * chiave è `cityKey`, la stessa del database, così "Milano", "milano" e
 * "Milano (MI)" restano una città sola.
 *
 * La soglia editoriale è tre serate future: sotto quella soglia la pagina resta
 * raggiungibile ma non entra nella sitemap e riceve `noindex`.
 */
export const CITY_INDEX_THRESHOLD = 3;

export type CitySummary = {
  /** Chiave normalizzata, uguale a `events.city_key`. */
  key: string;
  /** Forma da mostrare, scelta fra i valori realmente scritti. */
  label: string;
  /** Pezzo finale di `/citta/...`. */
  slug: string;
  /** Serate future pubblicate. */
  eventCount: number;
  nextEventAt: string | null;
  nextEventTimezone: string;
  /** `false` sotto la soglia: pagina raggiungibile ma fuori indice. */
  indexable: boolean;
};

type EmbeddedCity = { city: string | null } | Array<{ city: string | null }> | null;

type CityEventRow = {
  city: string | null;
  starts_at: string;
  timezone: string | null;
  venues: EmbeddedCity;
  artists: EmbeddedCity;
};

type CityGroup = {
  labels: string[];
  /** Solo le serate future contano per l'indice e per la soglia. */
  futureCount: number;
  nextEventAt: string | null;
  nextEventTimezone: string;
};

const CITY_ROW_SELECT = "city, starts_at, timezone, venues ( city ), artists ( city )";

/** Quante righe leggere in una volta; oltre, il database risponde comunque a blocchi. */
const CITY_ROWS_PAGE = 1000;
/** Tetto di sicurezza: oltre cinquemila serate pubblicate servirà una query aggregata. */
const CITY_ROWS_MAX = 5000;
/** Righe senza città da controllare: la città può arrivare dal locale o dall'artista. */
const CITY_FALLBACK_ROWS = 300;

function embeddedCity(value: EmbeddedCity): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0]?.city ?? null) : value.city;
}

/**
 * Legge le serate pubblicate a blocchi.
 *
 * `events.city` è la fonte principale, ma quando un evento è collegato a un
 * locale la città può essere quella della scheda del locale: per questo la
 * selezione porta con sé anche le due relazioni.
 */
async function readPublishedCityRows(): Promise<CityEventRow[]> {
  const supabase = await createClient();
  const rows: CityEventRow[] = [];

  for (let offset = 0; offset < CITY_ROWS_MAX; offset += CITY_ROWS_PAGE) {
    const { data, error } = await supabase
      .from("events")
      .select(CITY_ROW_SELECT)
      .eq("status", "published")
      // Dalla più recente: se il tetto di sicurezza taglia, taglia il passato
      // remoto, mai una serata futura.
      .order("starts_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + CITY_ROWS_PAGE - 1);

    if (error) {
      console.error("[cities] readPublishedCityRows:", error.message);
      break;
    }

    const batch = (data ?? []) as unknown as CityEventRow[];
    rows.push(...batch);

    if (batch.length < CITY_ROWS_PAGE) break;
  }

  return rows;
}

/**
 * Le città con almeno una serata pubblicata.
 *
 * `eventCount` conta solo le serate future, quindi l'indice può mostrare le
 * città "vive" e lasciare comunque raggiungibili quelle finite. `cache` evita
 * di ripetere la lettura quando la pagina e i metadati chiedono gli stessi dati
 * nella stessa richiesta.
 */
export const listCityDirectory = cache(async (): Promise<CitySummary[]> => {
  const now = Date.now();
  const rows = await readPublishedCityRows();
  const groups = new Map<string, CityGroup>();

  for (const row of rows) {
    const rawCity = row.city ?? embeddedCity(row.venues) ?? embeddedCity(row.artists);
    if (!rawCity) continue;

    const key = cityKey(rawCity);
    if (!key) continue;

    const future = new Date(row.starts_at).getTime() >= now;
    const existing = groups.get(key);

    if (existing) {
      existing.labels.push(rawCity);
      if (future) {
        existing.futureCount += 1;
        const nextTime = existing.nextEventAt
          ? new Date(existing.nextEventAt).getTime()
          : Number.POSITIVE_INFINITY;
        if (new Date(row.starts_at).getTime() < nextTime) {
          existing.nextEventAt = row.starts_at;
          existing.nextEventTimezone = row.timezone ?? "Europe/Rome";
        }
      }
      continue;
    }

    groups.set(key, {
      labels: [rawCity],
      futureCount: future ? 1 : 0,
      nextEventAt: future ? row.starts_at : null,
      nextEventTimezone: row.timezone ?? "Europe/Rome",
    });
  }

  const cities: CitySummary[] = [];

  for (const [key, group] of groups) {
    const label = preferredCityLabel(group.labels);
    if (!label) continue;

    cities.push({
      key,
      label,
      slug: slugify(label),
      eventCount: group.futureCount,
      nextEventAt: group.nextEventAt,
      nextEventTimezone: group.nextEventTimezone,
      indexable: group.futureCount >= CITY_INDEX_THRESHOLD,
    });
  }

  return cities.sort((a, b) => a.label.localeCompare(b.label, "it"));
});

/**
 * Una città dallo slug pubblico. `null` solo se non ha mai avuto una serata
 * pubblicata: una città "finita" resta online con lo stato vuoto.
 */
export const getCityBySlug = cache(async (slug: string): Promise<CitySummary | null> => {
  const cities = await listCityDirectory();
  const normalized = slug.toLowerCase();
  return cities.find((city) => city.slug === normalized) ?? null;
});

/**
 * Le prossime serate di una città.
 *
 * La query principale usa `city_key`. Le righe senza città vengono controllate
 * a parte, perché la scheda pubblica eredita la città dal locale o dall'artista:
 * senza questo secondo passaggio un evento collegato a un locale senza città
 * sparirebbe dalla pagina della sua città.
 */
export async function listUpcomingEventsForCity(
  city: CitySummary,
  limit = 40
): Promise<PublicEvent[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [byCity, withoutCity] = await Promise.all([
    supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "published")
      .gte("starts_at", now)
      .eq("city_key", city.key)
      .order("starts_at", { ascending: true })
      .limit(limit),
    supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "published")
      .gte("starts_at", now)
      .is("city", null)
      .order("starts_at", { ascending: true })
      .limit(CITY_FALLBACK_ROWS),
  ]);

  if (byCity.error) {
    console.error("[cities] listUpcomingEventsForCity:", byCity.error.message);
  }
  if (withoutCity.error) {
    console.error("[cities] listUpcomingEventsForCity fallback:", withoutCity.error.message);
  }

  const events = new Map<string, PublicEvent>();

  for (const row of (byCity.data ?? []) as unknown as EventRow[]) {
    const event = toPublicEvent(row);
    events.set(event.id, event);
  }

  for (const row of (withoutCity.data ?? []) as unknown as EventRow[]) {
    const event = toPublicEvent(row);
    if (cityKey(event.city) === city.key) events.set(event.id, event);
  }

  return [...events.values()]
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, limit);
}
