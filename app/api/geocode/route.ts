import { NextResponse } from "next/server";

import { reversePlace, searchPlaces } from "@/lib/geo/geocoder";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Ricerca di luoghi per l'editor: dal nome di una città (o di un indirizzo)
 * alle coordinate, così la mappa si sposta dove si tiene la serata.
 *
 * Due usi, una rotta sola:
 *   `?q=…`          cerca un posto (la città, la via, il locale);
 *   `?lat=…&lon=…`  chiede **dove siamo** (geocodifica inversa: quando il pin si
 *                   trascina, la città si riempie da sola).
 *
 * Come per la ricerca dei locali, risponde solo a chi ha una sessione: fuori
 * dall'editor di OpenStage non serve a nessuno.
 */
export async function GET(request: Request) {
  const session = await getSessionProfile();

  if (!session) {
    return NextResponse.json({ places: [] }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("lang") === "en" ? "en" : "it";
  const headers = { "cache-control": "no-store" };

  const latitude = Number.parseFloat(searchParams.get("lat") ?? "");
  const longitude = Number.parseFloat(searchParams.get("lon") ?? "");
  const hasPoint =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  if (hasPoint) {
    const place = await reversePlace(latitude, longitude, { locale });
    return NextResponse.json({ places: place ? [place] : [] }, { headers });
  }

  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const places = await searchPlaces(query, { locale });

  return NextResponse.json({ places }, { headers });
}
