import { Suspense } from "react";

import QuickFilters from "@/components/discovery/QuickFilters";
import SearchBar from "@/components/discovery/SearchBar";
import GlobeMap from "@/components/map/GlobeMap";
import {
  discoveryQuery,
  hasActiveFilters,
  parseDiscoveryFilters,
  toQueryFilters,
} from "@/lib/events/filters";
import { listGenres, listMapEvents, listSavedEventIds } from "@/lib/events/queries";
import { getVisitorLocation } from "@/lib/geo/visitor";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { DEFAULT_ZOOM, MAX_MAP_EVENTS, REGION_ZOOM } from "@/lib/map/config";
import { getSessionProfile } from "@/lib/supabase/session";

export const generateMetadata = () => getPageMetadata((dict) => dict.map);

type MapPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Modalità "Esplora" a schermo intero: stessa mappa della Home, ma con gesture
 * libere (un dito trascina la mappa) e più spazio per i pin.
 *
 * Ricerca e filtri restano sovrapposti alla mappa e vivono negli stessi
 * `searchParams` della Home: passando da una all'altra non si perde niente.
 */
export default async function MapPage({ searchParams }: MapPageProps) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const params = await searchParams;

  const [visitor, session, savedIds, genres] = await Promise.all([
    getVisitorLocation(),
    getSessionProfile(),
    listSavedEventIds(),
    listGenres(),
  ]);

  const filters = parseDiscoveryFilters(params, visitor.center);
  const mapEvents = await listMapEvents(toQueryFilters(filters), MAX_MAP_EVENTS);

  const filtered = hasActiveFilters(filters);
  const query = discoveryQuery(filters);

  const mapEmpty = filtered
    ? {
        title: dict.filters.noResultsTitle,
        text: dict.filters.noResultsText,
        cta: dict.filters.reset,
        href: "/mappa",
      }
    : {
        title: dict.map.emptyTitle,
        text: dict.map.emptyText,
        cta: dict.map.emptyCta,
        href: "/contatti",
      };

  return (
    <>
      <h1 className="sr-only">{dict.map.title}</h1>
      <GlobeMap
        events={mapEvents}
        initialCenter={visitor.center}
        initialZoom={visitor.fromIp ? REGION_ZOOM : DEFAULT_ZOOM}
        savedEventIds={[...savedIds]}
        isAuthenticated={Boolean(session)}
        locale={locale}
        variant="fullscreen"
        empty={mapEmpty}
        backHref={query ? `/?${query}` : "/"}
        overlay={
          <Suspense fallback={null}>
            <SearchBar locale={locale} />
            <QuickFilters
              locale={locale}
              genres={genres}
              center={visitor.center}
              className="mt-2"
            />
          </Suspense>
        }
      />
    </>
  );
}
