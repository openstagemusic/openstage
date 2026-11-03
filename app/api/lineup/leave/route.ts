import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getArtistByProfileId } from "@/lib/directory/queries";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * «Non posso più suonare»: l'artista esce dalla lineup.
 *
 * La riga sparisce subito e il gestore della serata riceve una notifica. Chi ha
 * creato la serata non può uscire dalla propria lineup: la funzione del
 * database lo rifiuta, e qui si riporta il motivo.
 */
export async function POST(request: Request) {
  const session = await getSessionProfile();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const artist = await getArtistByProfileId(session.id);
  if (!artist) return NextResponse.json({ ok: false, error: "notArtist" }, { status: 403 });

  let body: { eventId?: string };
  try {
    body = (await request.json()) as { eventId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const eventId = (body.eventId ?? "").trim();
  if (!eventId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_event_lineup", { p_event: eventId });

  if (error) {
    console.error("[lineup] leave:", error.message);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 400 });
  }

  // La scheda evento è statica: senza questo, l'uscita non si vede.
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true });
}
