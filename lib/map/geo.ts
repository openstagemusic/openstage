/**
 * Geometria di supporto per la mappa.
 *
 * Nessuna dipendenza esterna: MapLibre non ha un "cerchio in metri", quindi il
 * raggio d'area degli eventi con posizione approssimativa viene generato qui
 * come poligono geodetico.
 */

export type Coordinates = { longitude: number; latitude: number };

const EARTH_RADIUS_M = 6378137;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

/** Distanza in chilometri fra due punti (formula dell'emisenoverso). */
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return (2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)))) / 1000;
}

/**
 * Poligono (anello chiuso) che approssima un cerchio di raggio `radiusMeters`
 * attorno a un punto. Usato per disegnare l'area degli eventi approssimativi.
 */
export function circlePolygon(
  center: Coordinates,
  radiusMeters: number,
  steps = 72
): Array<[number, number]> {
  const angularDistance = radiusMeters / EARTH_RADIUS_M;
  const lat = toRadians(center.latitude);
  const lng = toRadians(center.longitude);

  const ring: Array<[number, number]> = [];

  for (let index = 0; index <= steps; index += 1) {
    const bearing = (index * 2 * Math.PI) / steps;

    const latitude = Math.asin(
      Math.sin(lat) * Math.cos(angularDistance) +
        Math.cos(lat) * Math.sin(angularDistance) * Math.cos(bearing)
    );

    const longitude =
      lng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat),
        Math.cos(angularDistance) - Math.sin(lat) * Math.sin(latitude)
      );

    ring.push([
      ((toDegrees(longitude) + 540) % 360) - 180,
      toDegrees(latitude),
    ]);
  }

  return ring;
}

export type BoundingBox = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

/**
 * Riquadro che contiene il cerchio di raggio `radiusKm`: è il filtro grossolano
 * applicato in SQL (l'eventuale filtro esatto in km viene rifinito in memoria).
 */
export function boundingBoxAround(center: Coordinates, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111.32;
  const cosLat = Math.max(0.01, Math.cos(toRadians(center.latitude)));
  const lngDelta = radiusKm / (111.32 * cosLat);

  return {
    minLatitude: Math.max(-90, center.latitude - latDelta),
    maxLatitude: Math.min(90, center.latitude + latDelta),
    minLongitude: Math.max(-180, center.longitude - lngDelta),
    maxLongitude: Math.min(180, center.longitude + lngDelta),
  };
}
