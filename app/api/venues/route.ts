import { NextResponse } from "next/server";

import { searchVenues } from "@/lib/dashboard/queries";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Ricerca fra i locali già su OpenStage: serve all'editor per collegare
 * l'evento a una scheda che esiste, invece di riscrivere nome e posizione.
 *
 * I locali sono dati pubblici, ma la ricerca risponde solo a chi ha una
 * sessione: non c'è motivo di offrirla a chiunque passi di lì.
 */
export async function GET(request: Request) {
  const session = await getSessionProfile();

  if (!session) {
    return NextResponse.json({ venues: [] }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 80);

  const venues = await searchVenues(query);

  return NextResponse.json({ venues }, { headers: { "cache-control": "no-store" } });
}
