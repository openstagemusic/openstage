"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { FeatureCollection, Point, Polygon } from "geojson";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type MapEventType,
  type MapLayerMouseEvent,
  type MapMouseEvent,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import EventCard from "@/components/map/EventCard";
import { hasCoordinates, type PublicEvent } from "@/lib/events/types";
import type { Locale } from "@/lib/i18n/config";
import {
  CLUSTER_MAX_ZOOM,
  INTRO_SPIN_DURATION,
  INTRO_SPIN_LATITUDE_OFFSET,
  INTRO_SPIN_LONGITUDE_OFFSET,
  INTRO_SPIN_ZOOM_OFFSET,
  LOCAL_ZOOM,
  MAP_ATTRIBUTION,
  MAP_COLORS,
  MAP_STYLE_URL,
  MAP_WORKER_URL,
  MIN_ZOOM,
} from "@/lib/map/config";
import { circlePolygon } from "@/lib/map/geo";

// MapLibre v6 tiene il worker in un file separato: lo serviamo dalla nostra
// origine (vedi `scripts/copy-maplibre-worker.mjs`).
if (typeof window !== "undefined") {
  setWorkerUrl(MAP_WORKER_URL);
}

const EVENTS_SOURCE = "openstage-events";
const AREAS_SOURCE = "openstage-areas";
const SELECTED_SOURCE = "openstage-selected";

const AREAS_FILL_LAYER = "openstage-areas-fill";
const AREAS_LINE_LAYER = "openstage-areas-line";
const CLUSTERS_LAYER = "openstage-clusters";
const CLUSTER_COUNT_LAYER = "openstage-cluster-count";
const POINTS_LAYER = "openstage-points";
const SELECTED_LAYER = "openstage-selected-halo";

const EMPTY_COLLECTION: FeatureCollection = { type: "FeatureCollection", features: [] };

function buildEventsCollection(events: PublicEvent[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: events.filter(hasCoordinates).map((event) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [event.longitude, event.latitude] },
      properties: {
        eventId: event.id,
        approximate: event.locationPrecision === "approximate",
      },
    })),
  };
}

function buildAreasCollection(events: PublicEvent[]): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: events
      .filter(hasCoordinates)
      .filter(
        (event) => event.locationPrecision === "approximate" && (event.areaRadiusM ?? 0) > 0
      )
      .map((event) => ({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            circlePolygon(
              { longitude: event.longitude, latitude: event.latitude },
              event.areaRadiusM ?? 1500
            ),
          ],
        },
        properties: { eventId: event.id },
      })),
  };
}

function applyProjection(map: MapLibreMap, view: "globe" | "flat") {
  map.setProjection({ type: view === "globe" ? "globe" : "mercator" });
}

/** Atmosfera del globo: se lo stile non la supporta, la mappa resta valida. */
function applySky(map: MapLibreMap) {
  try {
    map.setSky({
      "sky-color": "#05050c",
      "horizon-color": "#1b1440",
      "fog-color": "#07070d",
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.6,
      "fog-ground-blend": 0.4,
      "atmosphere-blend": 0.6,
    });
  } catch {
    // Nessuna atmosfera disponibile: non è un errore bloccante.
  }
}

/**
 * Etichette dei luoghi nella lingua dell'interfaccia: per l'italiano preferisce
 * `name:it` e ripiega sul nome locale. Lo stile di base è in inglese, quindi
 * senza questo passaggio un utente italiano leggerebbe "Rome".
 */
function applyLabelLanguage(map: MapLibreMap, locale: Locale) {
  if (locale !== "it") return;

  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== "symbol") continue;

    const layout = (layer as { layout?: Record<string, unknown> }).layout;
    const raw = JSON.stringify(layout?.["text-field"] ?? "");

    // Solo le etichette che usano un nome proprio: i codici stradali restano.
    if (!raw.includes('"name"')) continue;

    try {
      map.setLayoutProperty(layer.id, "text-field", [
        "coalesce",
        ["get", "name:it"],
        ["get", "name"],
      ]);
    } catch {
      // Layer non modificabile: si tiene l'etichetta originale.
    }
  }
}

function addLayers(map: MapLibreMap, events: PublicEvent[]) {
  map.addSource(EVENTS_SOURCE, {
    type: "geojson",
    data: buildEventsCollection(events),
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
  });

  map.addSource(AREAS_SOURCE, { type: "geojson", data: buildAreasCollection(events) });
  map.addSource(SELECTED_SOURCE, { type: "geojson", data: EMPTY_COLLECTION });

  map.addLayer({
    id: AREAS_FILL_LAYER,
    type: "fill",
    source: AREAS_SOURCE,
    paint: { "fill-color": MAP_COLORS.cyan, "fill-opacity": 0.12 },
  });

  map.addLayer({
    id: AREAS_LINE_LAYER,
    type: "line",
    source: AREAS_SOURCE,
    paint: {
      "line-color": MAP_COLORS.cyan,
      "line-width": 1.2,
      "line-opacity": 0.6,
      "line-dasharray": [2, 2],
    },
  });

  map.addLayer({
    id: SELECTED_LAYER,
    type: "circle",
    source: SELECTED_SOURCE,
    paint: {
      "circle-radius": 22,
      "circle-color": MAP_COLORS.cyan,
      "circle-opacity": 0.28,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": MAP_COLORS.cyan,
    },
  });

  map.addLayer({
    id: CLUSTERS_LAYER,
    type: "circle",
    source: EVENTS_SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        MAP_COLORS.violet,
        8,
        MAP_COLORS.cyan,
        40,
        MAP_COLORS.pink,
      ],
      "circle-radius": ["step", ["get", "point_count"], 16, 8, 22, 40, 28],
      "circle-opacity": 0.85,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "rgba(255,255,255,0.7)",
    },
  });

  map.addLayer({
    id: CLUSTER_COUNT_LAYER,
    type: "symbol",
    source: EVENTS_SOURCE,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#ffffff" },
  });

  map.addLayer({
    id: POINTS_LAYER,
    type: "circle",
    source: EVENTS_SOURCE,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": ["case", ["get", "approximate"], 8, 6],
      "circle-color": ["case", ["get", "approximate"], MAP_COLORS.cyan, MAP_COLORS.violet],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.95,
    },
  });
}

export type MapCanvasProps = {
  events: PublicEvent[];
  initialCenter: { longitude: number; latitude: number };
  initialZoom: number;
  view: "globe" | "flat";
  /** true = un dito scorre la pagina, due dita muovono la mappa. */
  cooperativeGestures: boolean;
  /** Ingresso rotante del globo che si assesta sulla zona dell'utente. */
  introSpin: boolean;
  selectedEventId: string | null;
  userPosition: { longitude: number; latitude: number } | null;
  savedEventIds: string[];
  isAuthenticated: boolean;
  locale: Locale;
  /** Pop-up ancorato al pin (desktop). Su mobile si usa il bottom sheet. */
  popupEnabled: boolean;
  /** Lascia spazio al player fisso in basso (attribuzione e controlli). */
  bottomInset?: boolean;
  /** Etichetta accessibile della regione mappa. */
  ariaLabel: string;
  onSelectEvent: (event: PublicEvent | null) => void;
};

/**
 * Istanza MapLibre: globo 3D con proiezione nativa, pin raggruppati, aree
 * approssimative e pop-up. Tutta l'interazione resta qui dentro; la UI intorno
 * (pulsanti, bottom sheet) vive in `GlobeMap`.
 */
export default function MapCanvas({
  events,
  initialCenter,
  initialZoom,
  view,
  cooperativeGestures,
  introSpin,
  selectedEventId,
  userPosition,
  savedEventIds,
  isAuthenticated,
  locale,
  popupEnabled,
  bottomInset = false,
  ariaLabel,
  onSelectEvent,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const markerRef = useRef<Marker | null>(null);

  // Nodo che ospita la scheda dell'evento dentro il pop-up di MapLibre.
  // Il contenuto arriva da un portal React: nessuna root manuale.
  const [popupNode] = useState<HTMLDivElement | null>(() =>
    typeof document === "undefined" ? null : document.createElement("div")
  );

  const selectedEvent = useMemo(
    () => (selectedEventId ? events.find((item) => item.id === selectedEventId) ?? null : null),
    [events, selectedEventId]
  );

  const eventsRef = useRef(events);
  eventsRef.current = events;
  const selectRef = useRef(onSelectEvent);
  selectRef.current = onSelectEvent;

  const [styleReady, setStyleReady] = useState(false);

  // --- Creazione della mappa (una sola volta) -------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: initialZoom,
      minZoom: MIN_ZOOM,
      maxPitch: 60,
      cooperativeGestures,
      attributionControl: { compact: true, customAttribution: MAP_ATTRIBUTION },
      locale: {
        "CooperativeGesturesHandler.MobileHelpText": "Usa due dita per muovere la mappa",
        "CooperativeGesturesHandler.WindowsHelpText":
          "Tieni premuto Ctrl e usa la rotella per lo zoom",
        "CooperativeGesturesHandler.MacHelpText": "Tieni premuto ⌘ e usa la rotella per lo zoom",
        "NavigationControl.ZoomIn": "Ingrandisci",
        "NavigationControl.ZoomOut": "Riduci",
        "AttributionControl.ToggleAttribution": "Mostra attribuzione",
      },
    });

    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

    map.on("style.load", () => {
      applyProjection(map, view);
      applySky(map);
      applyLabelLanguage(map, locale);
      addLayers(map, eventsRef.current);
      setStyleReady(true);
    });

    const handleClusterClick = async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id as number | undefined;
      const source = map.getSource(EVENTS_SOURCE) as GeoJSONSource | undefined;
      if (!feature || clusterId === undefined || !source) return;

      const zoom = await source.getClusterExpansionZoom(clusterId);
      const geometry = feature.geometry as Point;
      map.easeTo({
        center: geometry.coordinates as [number, number],
        zoom: Math.min(zoom + 0.3, 16),
        duration: 650,
      });
    };

    const handlePointClick = (event: MapLayerMouseEvent) => {
      const eventId = event.features?.[0]?.properties?.eventId as string | undefined;
      const found = eventsRef.current.find((item) => item.id === eventId);
      if (found) selectRef.current(found);
    };

    const handleBackgroundClick = (event: MapMouseEvent) => {
      const hits = map.queryRenderedFeatures(event.point, {
        layers: [POINTS_LAYER, CLUSTERS_LAYER],
      });
      if (hits.length === 0) selectRef.current(null);
    };

    const setCursor = (value: string) => () => {
      map.getCanvas().style.cursor = value;
    };

    map.on("click", CLUSTERS_LAYER, handleClusterClick);
    map.on("click", POINTS_LAYER, handlePointClick);
    map.on("click", handleBackgroundClick);
    map.on("mouseenter", CLUSTERS_LAYER, setCursor("pointer"));
    map.on("mouseleave", CLUSTERS_LAYER, setCursor(""));
    map.on("mouseenter", POINTS_LAYER, setCursor("pointer"));
    map.on("mouseleave", POINTS_LAYER, setCursor(""));

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
      setStyleReady(false);
    };
    // La mappa si crea una volta sola: le modifiche successive passano dagli
    // altri effetti (proiezione, dati, selezione, posizione utente).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Proiezione globo / piatta -------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    applyProjection(map, view);
  }, [view, styleReady]);

  // --- Dati (pin e aree) ---------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;

    (map.getSource(EVENTS_SOURCE) as GeoJSONSource | undefined)?.setData(
      buildEventsCollection(events)
    );
    (map.getSource(AREAS_SOURCE) as GeoJSONSource | undefined)?.setData(
      buildAreasCollection(events)
    );
  }, [events, styleReady]);

  // --- Selezione: alone, volo sul pin e pop-up -----------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;

    const source = map.getSource(SELECTED_SOURCE) as GeoJSONSource | undefined;

    if (!selectedEvent || !hasCoordinates(selectedEvent)) {
      source?.setData(EMPTY_COLLECTION);
      popupRef.current?.remove();
      popupRef.current = null;
      return;
    }

    source?.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [selectedEvent.longitude, selectedEvent.latitude] },
          properties: {},
        },
      ],
    });

    if (!popupEnabled || !popupNode) {
      popupRef.current?.remove();
      popupRef.current = null;
      return;
    }

    if (!popupRef.current) {
      popupRef.current = new Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 18,
        maxWidth: "22rem",
        className: "openstage-popup",
      });
      popupRef.current.on("close", () => {
        popupRef.current = null;
        selectRef.current(null);
      });
    }

    popupRef.current
      .setLngLat([selectedEvent.longitude, selectedEvent.latitude])
      .setDOMContent(popupNode)
      .addTo(map);

    map.easeTo({
      center: [selectedEvent.longitude, selectedEvent.latitude],
      zoom: Math.max(map.getZoom(), 11.5),
      // Il pin resta un po' sopra il centro: il pop-up ha spazio sotto di sé.
      padding: { top: 0, bottom: 150, left: 0, right: 0 },
      duration: 700,
    });
  }, [selectedEvent, styleReady, popupEnabled, popupNode]);

  // --- Posizione dell'utente ("Vicino a me") -------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPosition) return;

    if (markerRef.current) markerRef.current.remove();

    const element = document.createElement("div");
    element.className = "openstage-user-dot";

    markerRef.current = new Marker({ element, anchor: "center" })
      .setLngLat([userPosition.longitude, userPosition.latitude])
      .addTo(map);

    map.flyTo({
      center: [userPosition.longitude, userPosition.latitude],
      zoom: LOCAL_ZOOM,
      duration: 1200,
    });
  }, [userPosition]);

  // --- Ingresso rotante del globo ------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !introSpin) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = {
      center: [initialCenter.longitude, initialCenter.latitude] as [number, number],
      zoom: initialZoom,
    };

    // Parte ruotata e un po' più larga, poi si assesta sulla zona dell'utente.
    map.jumpTo({
      center: [
        initialCenter.longitude - INTRO_SPIN_LONGITUDE_OFFSET,
        Math.min(72, initialCenter.latitude + INTRO_SPIN_LATITUDE_OFFSET),
      ],
      zoom: Math.max(MIN_ZOOM, initialZoom - INTRO_SPIN_ZOOM_OFFSET),
    });

    map.easeTo({
      center: target.center,
      zoom: target.zoom,
      duration: INTRO_SPIN_DURATION,
      essential: true,
    });

    // Qualsiasi gesto dell'utente interrompe l'animazione.
    const stopEvents: Array<keyof MapEventType> = [
      "dragstart",
      "zoomstart",
      "rotatestart",
      "touchstart",
      "wheel",
      "mousedown",
    ];
    const stop = () => map.stop();
    stopEvents.forEach((name) => map.on(name, stop));

    return () => {
      stopEvents.forEach((name) => map.off(name, stop));
    };
  }, [introSpin, styleReady, initialCenter.longitude, initialCenter.latitude, initialZoom]);

  return (
    <div className={`absolute inset-0 ${bottomInset ? "openstage-map-inset" : ""}`}>
      {/*
        Il contenitore di MapLibre non può essere posizionato con le utility:
        il suo CSS (`.maplibregl-map { position: relative }`) vince sull'ordine
        del bundle. Il posizionamento sta quindi nel guscio esterno.
      */}
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label={ariaLabel}
      />

      {/* Scheda dell'evento dentro il pop-up di MapLibre (portal React). */}
      {popupEnabled && popupNode && selectedEvent
        ? createPortal(
            <EventCard
              event={selectedEvent}
              locale={locale}
              variant="popup"
              initiallySaved={savedEventIds.includes(selectedEvent.id)}
              isAuthenticated={isAuthenticated}
            />,
            popupNode
          )
        : null}
    </div>
  );
}
