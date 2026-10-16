import GlobeMap from "@/components/map/GlobeMap";
import { listMapEvents, listSavedEventIds } from "@/lib/events/queries";
import { getVisitorLocation } from "@/lib/geo/visitor";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { DEFAULT_ZOOM, MAX_MAP_EVENTS, REGION_ZOOM } from "@/lib/map/config";
import { getSessionProfile } from "@/lib/supabase/session";

export const generateMetadata = () => getPageMetadata((dict) => dict.map);

/**
 * Modalità "Esplora" a schermo intero: stessa mappa della Home, ma con gesture
 * libere (un dito trascina la mappa) e più spazio per i pin.
 */
export default async function MapPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [visitor, session, mapEvents, savedIds] = await Promise.all([
    getVisitorLocation(),
    getSessionProfile(),
    listMapEvents({}, MAX_MAP_EVENTS),
    listSavedEventIds(),
  ]);

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
        emptyCtaHref="/contatti"
      />
    </>
  );
}
