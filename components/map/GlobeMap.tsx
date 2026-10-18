"use client";

import dynamic from "next/dynamic";
import Link from "@/components/i18n/LocaleLink";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import EventCard from "@/components/map/EventCard";
import VenueEventsCard from "@/components/map/VenueEventsCard";
import { hasCoordinates, type PublicEvent } from "@/lib/events/types";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { USER_ACCURATE_METERS } from "@/lib/map/config";
import { groupEventsByVenue, type MapSelection } from "@/lib/map/venues";
import { cn } from "@/lib/utils";

/**
 * La mappa è pesante (MapLibre + tile): la carichiamo solo quando serve, con
 * un chunk separato che non entra nel bundle iniziale della pagina.
 */
const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <MapSkeleton label="" />,
});

function MapSkeleton({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/70">
      <div className="h-24 w-24 animate-pulse rounded-full border border-white/10 bg-gradient-to-br from-violet/30 via-cyan/20 to-transparent" />
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export type GlobeMapProps = {
  events: PublicEvent[];
  initialCenter: { longitude: number; latitude: number };
  initialZoom: number;
  savedEventIds: string[];
  isAuthenticated: boolean;
  locale: Locale;
  /** `home`: riquadro dentro la pagina. `fullscreen`: pagina /mappa. */
  variant?: "home" | "fullscreen";
  className?: string;
  /** Messaggio dello stato vuoto: dipende dai filtri, quindi lo decide la pagina. */
  empty: { title: string; text: string; cta: string; href: string };
  /** Dove porta "Apri a schermo intero" (i filtri correnti viaggiano con te). */
  fullscreenHref?: string;
  /** Dove porta "Torna a esplorare". */
  backHref?: string;
  /** Contenuto sovrapposto alla mappa (ricerca e filtri a schermo intero). */
  overlay?: ReactNode;
};

/**
 * Contenitore della mappa: pulsanti, stato vuoto, bottom sheet mobile e
 * caricamento pigro. Su mobile vale la regola "un dito scorre la pagina, due
 * dita muovono la mappa"; a schermo intero (/mappa) le gesture sono libere.
 */
export default function GlobeMap({
  events,
  initialCenter,
  initialZoom,
  savedEventIds,
  isAuthenticated,
  locale,
  variant = "home",
  className,
  empty,
  fullscreenHref = "/mappa",
  backHref = "/",
  overlay,
}: GlobeMapProps) {
  const dict = getDictionary(locale);
  const isMobile = useIsMobile();

  const [view, setView] = useState<"globe" | "flat">("globe");
  const [mounted, setMounted] = useState(variant === "fullscreen");
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [userPosition, setUserPosition] = useState<{
    longitude: number;
    latitude: number;
    /** Errore dichiarato dal browser, in metri. */
    accuracy: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const locatedEvents = useMemo(() => events.filter(hasCoordinates), [events]);

  // Il raggruppamento è calcolato qui e non solo dentro la mappa: serve anche
  // al bottom sheet mobile e a capire se la selezione esiste ancora.
  const groups = useMemo(() => groupEventsByVenue(events), [events]);

  // La selezione è ricavata dai dati correnti: se un filtro fa sparire la
  // serata (o tutte le serate del locale) la scheda si chiude da sola.
  const resolved = useMemo<MapSelection | null>(() => {
    if (!selection) return null;

    if (selection.type === "event") {
      const event = events.find((item) => item.id === selection.event.id);
      return event ? { type: "event", event } : null;
    }

    const group = groups.find((item) => item.key === selection.group.key);
    return group ? { type: "venue", group } : null;
  }, [selection, events, groups]);

  // Caricamento pigro: la mappa entra in scena solo quando si avvicina alla viewport.
  useEffect(() => {
    if (mounted) return;
    const node = containerRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted]);

  // Se la selezione non esiste più nei dati correnti, la dimentichiamo.
  useEffect(() => {
    if (selection && !resolved) setSelection(null);
  }, [selection, resolved]);

  const locate = () => {
    setLocationError(null);
    setLocationNote(null);

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationError(dict.map.locateError);
      return;
    }

    setLocating(true);

    /** Il browser dichiara quanto è preciso: se è grossolano lo diciamo. */
    const accept = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;

      setLocating(false);
      setUserPosition({
        latitude,
        longitude,
        accuracy: Number.isFinite(accuracy) ? accuracy : 0,
      });

      if (accuracy > USER_ACCURATE_METERS) {
        const format = new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-GB", {
          maximumFractionDigits: accuracy < 10_000 ? 1 : 0,
        });
        setLocationNote(
          dict.map.locateCoarse.replace("{km}", format.format(accuracy / 1000))
        );
      }
    };

    const fail = () => {
      setLocating(false);
      setLocationError(dict.map.locateError);
    };

    navigator.geolocation.getCurrentPosition(
      accept,
      (error) => {
        // "Permesso negato" non si ritenta: l'utente ha già risposto e il
        // browser non chiederebbe di nuovo.
        if (error.code === error.PERMISSION_DENIED) {
          fail();
          return;
        }

        // Un computer senza posizione di sistema attiva può non rispondere a
        // una richiesta precisa: il secondo tentativo, più grossolano, almeno
        // dà la zona. `maximumAge` resta alto solo qui, dove serve una risposta.
        navigator.geolocation.getCurrentPosition(accept, fail, {
          enableHighAccuracy: false,
          timeout: 8_000,
          maximumAge: 300_000,
        });
      },
      // Niente posizione in cache: "Vicino a me" deve dire dove sei **adesso**.
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  };

  const wrapperClass =
    variant === "fullscreen"
      ? "relative h-[calc(100dvh-4rem)] w-full overflow-hidden"
      : "glass relative overflow-hidden rounded-3xl border border-white/10";

  const innerClass =
    variant === "fullscreen" ? "relative h-full w-full" : "relative h-[68vh] min-h-[420px] sm:h-[560px]";

  const controlClass =
    "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-bg/80 px-3 py-2 text-xs font-medium text-white backdrop-blur transition-colors hover:border-white/30";

  return (
    <section className={cn(wrapperClass, className)}>
      <div ref={containerRef} className={innerClass}>
        {mounted ? (
          <MapCanvas
            events={events}
            initialCenter={initialCenter}
            initialZoom={initialZoom}
            view={view}
            cooperativeGestures={variant === "home"}
            introSpin={variant === "home" && !isMobile}
            selection={resolved}
            userPosition={userPosition}
            savedEventIds={savedEventIds}
            isAuthenticated={isAuthenticated}
            locale={locale}
            popupEnabled={!isMobile}
            bottomInset={variant === "fullscreen"}
            ariaLabel={dict.map.title}
            onSelect={setSelection}
          />
        ) : (
          <MapSkeleton label={dict.map.loading} />
        )}

        {/* Controlli sovrapposti */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={locate} disabled={locating} className={controlClass}>
              <span aria-hidden="true">◎</span>
              {locating ? dict.map.locating : dict.map.nearMe}
            </button>

            <div className="pointer-events-auto inline-flex overflow-hidden rounded-full border border-white/15 bg-bg/80 text-xs font-medium backdrop-blur">
              <button
                type="button"
                onClick={() => setView("globe")}
                aria-pressed={view === "globe"}
                className={cn(
                  "px-3 py-2 transition-colors",
                  view === "globe" ? "bg-white/10 text-white" : "text-muted hover:text-white"
                )}
              >
                {dict.map.globe}
              </button>
              <button
                type="button"
                onClick={() => setView("flat")}
                aria-pressed={view === "flat"}
                className={cn(
                  "px-3 py-2 transition-colors",
                  view === "flat" ? "bg-white/10 text-white" : "text-muted hover:text-white"
                )}
              >
                {dict.map.flat}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {locatedEvents.length > 0 ? (
              <span className="pointer-events-none hidden rounded-full border border-white/10 bg-bg/70 px-3 py-2 text-xs text-muted backdrop-blur sm:inline-flex">
                {locatedEvents.length}{" "}
                {locatedEvents.length === 1 ? dict.map.eventOnMap : dict.map.eventsOnMap}
              </span>
            ) : null}

            <Link
              href={variant === "home" ? fullscreenHref : backHref}
              aria-label={variant === "home" ? dict.map.fullscreen : dict.map.backToExplore}
              className={controlClass}
            >
              {/* Su mobile il testo non ci sta accanto agli altri controlli:
                  resta l'icona, con l'etichetta per chi usa un lettore di schermo. */}
              <span aria-hidden="true">{variant === "home" ? "⤢" : "←"}</span>
              <span className="hidden sm:inline">
                {variant === "home" ? dict.map.fullscreen : dict.map.backToExplore}
              </span>
            </Link>
          </div>
        </div>

        {/* Contenuto extra sovrapposto (ricerca e filtri della modalità Esplora) */}
        {overlay ? (
          <div className="pointer-events-none absolute inset-x-0 top-14 z-30 flex justify-center px-3 sm:top-16">
            <div className="pointer-events-auto w-full max-w-2xl">{overlay}</div>
          </div>
        ) : null}

        {/* Stato vuoto: nessun evento reale nel database (o nessuno con i filtri) */}
        {mounted && locatedEvents.length === 0 ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-center p-4">
            <div className="glass max-w-md rounded-2xl border border-white/10 p-5 text-center">
              <h2 className="font-display text-base font-semibold">{empty.title}</h2>
              <p className="mt-2 text-sm text-muted">{empty.text}</p>
              <Link
                href={empty.href}
                className="mt-4 inline-flex rounded-full bg-gradient-to-r from-violet to-cyan px-4 py-2 text-xs font-medium text-white"
              >
                {empty.cta}
              </Link>
            </div>
          </div>
        ) : null}

        {locationError ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-center text-xs text-pink">
            {locationError}
          </p>
        ) : null}

        {locationNote ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-center text-xs text-muted">
            {locationNote}
          </p>
        ) : null}
      </div>

      {/* Mobile: bottom sheet al posto del pop-up */}
      {isMobile && resolved ? (
        <div className="fixed inset-x-0 bottom-0 z-[60] px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          {resolved.type === "event" ? (
            <EventCard
              event={resolved.event}
              locale={locale}
              variant="sheet"
              initiallySaved={savedEventIds.includes(resolved.event.id)}
              isAuthenticated={isAuthenticated}
              onClose={() => setSelection(null)}
            />
          ) : (
            <VenueEventsCard
              group={resolved.group}
              locale={locale}
              variant="sheet"
              onClose={() => setSelection(null)}
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
