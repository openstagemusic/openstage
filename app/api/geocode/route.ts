import { NextResponse } from "next/server";

import { reversePlace, searchPlaces } from "@/lib/geo/geocoder";
import { checkEventLocation } from "@/lib/geo/location-check";
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
 * Con `&city=…` la stessa richiesta risponde anche alla domanda «la città scritta
 * e il pin sono d'accordo?». È un avviso, non una sentenza: l'editor lo mostra
 * mentre si scrive, e il salvataggio rifà il controllo per conto suo.
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

  const city = (searchParams.get("city") ?? "").trim().slice(0, 80);

  if (hasPoint) {
    // Quando c'è una città da confrontare, la geocodifica inversa si fa **una
    // volta sola** dentro il controllo: due chiamate identiche in parallelo
    // fanno arrabbiare Photon (e la seconda scade).
    if (city === "") {
      const place = await reversePlace(latitude, longitude, { locale });
      return NextResponse.json({ places: place ? [place] : [] }, { headers });
    }

    const locationCheck = await checkEventLocation({ latitude, longitude, city, locale });

    return NextResponse.json(
      {
        places: locationCheck.place ? [locationCheck.place] : [],
        locationCheck,
      },
      { headers }
    );
  }

  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const places = await searchPlaces(query, { locale });

  return NextResponse.json({ places }, { headers });
}
