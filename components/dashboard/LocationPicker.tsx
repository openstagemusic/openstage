"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import { useEffect, useRef } from "react";

import { MAP_ATTRIBUTION, MAP_STYLE_URL, MAP_WORKER_URL } from "@/lib/map/config";

// Come nella mappa grande: il worker lo serviamo dalla nostra origine.
if (typeof window !== "undefined") {
  setWorkerUrl(MAP_WORKER_URL);
}

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  /** Dove aprire la mappa quando il pin non c'è ancora. */
  center: { latitude: number; longitude: number };
  ariaLabel: string;
  onChange: (point: { latitude: number; longitude: number }) => void;
};

/**
 * Mini mappa dell'editor: il pin si trascina (o si sposta cliccando).
 *
 * Non c'è nessun geocodificatore dietro: la posizione la mette la persona che
 * organizza la serata, che è l'unica a sapere dove si tiene davvero. Il locale,
 * se è già su OpenStage, porta con sé le sue coordinate.
 */
export default function LocationPicker({
  latitude,
  longitude,
  center,
  ariaLabel,
  onChange,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const hasPin = typeof latitude === "number" && typeof longitude === "number";

  // La mappa si crea una volta sola; il pin e il centro si aggiornano dopo.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const start = hasPin ? { latitude: latitude!, longitude: longitude! } : center;

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: [start.longitude, start.latitude],
      zoom: hasPin ? 14 : 12,
      attributionControl: { compact: true, customAttribution: MAP_ATTRIBUTION },
      locale: {
        "NavigationControl.ZoomIn": "Ingrandisci",
        "NavigationControl.ZoomOut": "Riduci",
        "AttributionControl.ToggleAttribution": "Mostra attribuzione",
      },
    });

    mapRef.current = map;

    map.on("click", (event) => {
      changeRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      const element = document.createElement("div");
      element.className = "openstage-edit-pin";

      const marker = new Marker({ element, draggable: true, anchor: "bottom" });

      marker.on("dragend", () => {
        const position = markerRef.current?.getLngLat();
        if (position) changeRef.current({ latitude: position.lat, longitude: position.lng });
      });

      markerRef.current = marker;
      marker.setLngLat([longitude, latitude]).addTo(map);
      return;
    }

    markerRef.current.setLngLat([longitude, latitude]);
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={ariaLabel}
      className="h-64 w-full overflow-hidden rounded-2xl border border-white/10"
    />
  );
}
