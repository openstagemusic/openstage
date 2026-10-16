"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import EventCard from "@/components/map/EventCard";
import { hasCoordinates, type PublicEvent } from "@/lib/events/types";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
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
  emptyCtaHref: string;
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
  emptyCtaHref,
}: GlobeMapProps) {
  const dict = getDictionary(locale);
  const isMobile = useIsMobile();

  const [view, setView] = useState<"globe" | "flat">("globe");
  const [mounted, setMounted] = useState(variant === "fullscreen");
  const [selected, setSelected] = useState<PublicEvent | null>(null);
  const [userPosition, setUserPosition] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const locatedEvents = useMemo(() => events.filter(hasCoordinates), [events]);

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

  // Se un filtro fa sparire l'evento selezionato, il pop-up si chiude.
  useEffect(() => {
    if (selected && !events.some((item) => item.id === selected.id)) {
      setSelected(null);
    }
  }, [events, selected]);

  const locate = () => {
    setLocationError(null);

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationError(dict.map.locateError);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setUserPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setLocating(false);
        setLocationError(dict.map.locateError);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
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
            selectedEventId={selected?.id ?? null}
            userPosition={userPosition}
            savedEventIds={savedEventIds}
            isAuthenticated={isAuthenticated}
            locale={locale}
            popupEnabled={!isMobile}
            bottomInset={variant === "fullscreen"}
            ariaLabel={dict.map.title}
            onSelectEvent={setSelected}
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
              href={variant === "home" ? "/mappa" : "/"}
              className={controlClass}
            >
              {variant === "home" ? dict.map.fullscreen : dict.map.backToExplore}
            </Link>
          </div>
        </div>

        {/* Stato vuoto: nessun evento reale nel database */}
        {mounted && locatedEvents.length === 0 ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-center p-4">
            <div className="glass max-w-md rounded-2xl border border-white/10 p-5 text-center">
              <h2 className="font-display text-base font-semibold">{dict.map.emptyTitle}</h2>
              <p className="mt-2 text-sm text-muted">{dict.map.emptyText}</p>
              <Link
                href={emptyCtaHref}
                className="mt-4 inline-flex rounded-full bg-gradient-to-r from-violet to-cyan px-4 py-2 text-xs font-medium text-white"
              >
                {dict.map.emptyCta}
              </Link>
            </div>
          </div>
        ) : null}

        {locationError ? (
          <p className="absolute inset-x-0 bottom-0 p-3 text-center text-xs text-pink">
            {locationError}
          </p>
        ) : null}
      </div>

      {/* Mobile: bottom sheet al posto del pop-up */}
      {isMobile && selected ? (
        <div className="fixed inset-x-0 bottom-0 z-[60] px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          <EventCard
            event={selected}
            locale={locale}
            variant="sheet"
            initiallySaved={savedEventIds.includes(selected.id)}
            isAuthenticated={isAuthenticated}
            onClose={() => setSelected(null)}
          />
        </div>
      ) : null}
    </section>
  );
}
