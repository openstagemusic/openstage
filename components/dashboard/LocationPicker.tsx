"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import { useEffect, useRef } from "react";

import { MAP_ATTRIBUTION, MAP_STYLE_URL, MAP_WORKER_URL } from "@/lib/map/config";

// Come nella mappa grande: il worker lo serviamo dalla nostra origine.
if (typeof window !== "undefined") {
  setWorkerUrl(MAP_WORKER_URL);
}

/** Un posto scelto fuori dalla mappa (locale collegato, città cercata). */
export type MapFocus = {
  latitude: number;
  longitude: number;
  zoom: number;
  /** Cambia a ogni scelta: è il segnale che si deve volare. */
  token: number;
};

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  /** Dove aprire la mappa quando il pin non c'è ancora. */
  center: { latitude: number; longitude: number };
  /**
   * Coordinate da mostrare quando il posto è stato scelto altrove. La mappa ci
   * vola sopra: il pin non deve mai finire fuori dallo schermo, a cercarselo.
   */
  focus: MapFocus | null;
  ariaLabel: string;
  onChange: (point: { latitude: number; longitude: number }) => void;
};

/**
 * Mini mappa dell'editor: il pin si trascina (o si sposta cliccando).
 *
 * La posizione finale la mette la persona che organizza la serata, che è
 * l'unica a sapere dove si tiene davvero: qui si arriva già col posto giusto
 * (il locale collegato, o la città cercata nel campo qui sopra) e il pin serve
 * a precisare. Volare sul posto scelto è parte del patto: chi sceglie "Druso"
 * deve **vedere** il pin, non andarlo a cercare.
 */
export default function LocationPicker({
  latitude,
  longitude,
  center,
  focus,
  ariaLabel,
  onChange,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const changeRef = useRef(onChange);
  const flownRef = useRef(0);
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

  // La mappa vola sul posto scelto altrove. Solo su una scelta nuova (`token`):
  // volare a ogni movimento del pin sarebbe una lotta con chi lo trascina.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || focus.token === flownRef.current) return;

    flownRef.current = focus.token;

    map.flyTo({ center: [focus.longitude, focus.latitude], zoom: focus.zoom, duration: 900 });
  }, [focus]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={ariaLabel}
      className="h-64 w-full overflow-hidden border border-line"
    />
  );
}
