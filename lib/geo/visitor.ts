import { headers } from "next/headers";

import { DEFAULT_CENTER } from "@/lib/map/config";

/**
 * Posizione approssimativa del visitatore, ricavata dagli header geografici
 * della piattaforma di hosting (Vercel: `x-vercel-ip-*`).
 *
 * Nessun permesso del browser viene chiesto qui: la geolocalizzazione precisa
 * resta un'azione esplicita dell'utente ("Vicino a me").
 */
export type VisitorLocation = {
  center: { longitude: number; latitude: number };
  city: string | null;
  country: string | null;
  /** true quando il centro viene dagli header IP, false quando è il ripiego. */
  fromIp: boolean;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function getVisitorLocation(): Promise<VisitorLocation> {
  const store = await headers();

  const latitude = Number.parseFloat(store.get("x-vercel-ip-latitude") ?? "");
  const longitude = Number.parseFloat(store.get("x-vercel-ip-longitude") ?? "");
  const cityHeader = store.get("x-vercel-ip-city");

  const fromIp =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  return {
    center: fromIp ? { latitude, longitude } : { ...DEFAULT_CENTER },
    city: cityHeader ? safeDecode(cityHeader) : null,
    country: store.get("x-vercel-ip-country") ?? null,
    fromIp,
  };
}
