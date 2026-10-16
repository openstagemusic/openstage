import { NextResponse } from "next/server";

import { suggestEvents } from "@/lib/events/queries";

/**
 * Suggerimenti della barra di ricerca.
 *
 * Fonte unica: il nostro database (città, artisti, locali, generi, eventi già
 * pubblicati). Nessun geocoder esterno: ogni suggerimento resta dentro
 * OpenStage e porta a qualcosa che esiste davvero.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 80);

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = await suggestEvents(query);

  return NextResponse.json(
    { suggestions },
    { headers: { "cache-control": "no-store" } }
  );
}
