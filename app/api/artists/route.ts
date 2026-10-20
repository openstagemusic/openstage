import { NextResponse } from "next/server";

import { searchArtists } from "@/lib/dashboard/queries";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Ricerca fra gli artisti già su OpenStage.
 *
 * Serve al modulo del **locale**: quando organizza una serata per un artista che
 * ha già una scheda, la collega invece di lasciare la serata orfana. Come per i
 * locali, risponde solo a chi ha una sessione.
 */
export async function GET(request: Request) {
  const session = await getSessionProfile();

  if (!session) {
    return NextResponse.json({ artists: [] }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 80);

  const artists = await searchArtists(query);

  return NextResponse.json({ artists }, { headers: { "cache-control": "no-store" } });
}
