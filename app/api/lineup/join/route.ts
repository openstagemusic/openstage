import { NextResponse } from "next/server";

import { getArtistByProfileId } from "@/lib/directory/queries";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * «Sono in questa serata»: stato e invio della richiesta.
 *
 * Sta in una route, e non nella pagina, perché la scheda evento è statica: se
 * leggesse la sessione diventerebbe dinamica per tutti, anche per chi non è
 * loggato. Qui si paga un giro in più solo quando serve.
 */

type JoinState =
  | "guest"
  | "not-artist"
  | "member"
  | "pending"
  | "owner"
  | "closed"
  | "can-ask";

export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("event") ?? "";
  if (!eventId) return NextResponse.json({ state: "closed" satisfies JoinState });

  const session = await getSessionProfile();
  if (!session) return NextResponse.json({ state: "guest" satisfies JoinState });

  const artist = await getArtistByProfileId(session.id);
  if (!artist) return NextResponse.json({ state: "not-artist" satisfies JoinState });

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, created_by, status, starts_at, cancelled_at")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return NextResponse.json({ state: "closed" satisfies JoinState });

  const closed =
    event.status !== "published" ||
    Boolean(event.cancelled_at) ||
    new Date(event.starts_at).getTime() <= Date.now();

  if (closed) return NextResponse.json({ state: "closed" satisfies JoinState });

  // È la sua serata: non deve chiedere permesso a sé stesso.
  if (event.created_by === session.id) {
    return NextResponse.json({ state: "owner" satisfies JoinState, artistName: artist.name });
  }

  const [{ data: inLineup }, { data: pending }] = await Promise.all([
    supabase
      .from("event_artists")
      .select("artist_id")
      .eq("event_id", eventId)
      .eq("artist_id", artist.id)
      .maybeSingle(),
    supabase
      .from("event_join_requests")
      .select("id")
      .eq("event_id", eventId)
      .eq("artist_id", artist.id)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  if (inLineup) {
    return NextResponse.json({ state: "member" satisfies JoinState, artistName: artist.name });
  }

  if (pending) {
    return NextResponse.json({ state: "pending" satisfies JoinState, artistName: artist.name });
  }

  return NextResponse.json({ state: "can-ask" satisfies JoinState, artistName: artist.name });
}

export async function POST(request: Request) {
  const session = await getSessionProfile();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const artist = await getArtistByProfileId(session.id);
  if (!artist) return NextResponse.json({ ok: false, error: "notArtist" }, { status: 403 });

  let body: { eventId?: string; message?: string };
  try {
    body = (await request.json()) as { eventId?: string; message?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const eventId = (body.eventId ?? "").trim();
  if (!eventId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  const message = (body.message ?? "").trim().slice(0, 400);

  const supabase = await createClient();
  const { error } = await supabase.from("event_join_requests").insert({
    event_id: eventId,
    artist_id: artist.id,
    message: message.length > 0 ? message : null,
  });

  if (error) {
    // Richiesta già aperta: non è un guasto, è la stessa cosa chiesta due volte.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, state: "pending" });
    }
    console.error("[lineup] join:", error.message);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, state: "pending" });
}
