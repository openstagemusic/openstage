import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Export dei propri dati (portabilità).
 *
 * Un JSON leggibile con profilo, scheda, eventi, preferiti, schede seguite,
 * conversazioni e note. Passa dal client normale, quindi la RLS limita già
 * tutto a quello che appartiene a chi chiede.
 */
export async function GET() {
  const session = await getSessionProfile();

  if (!session) {
    return new Response("Non autorizzato", { status: 401 });
  }

  const supabase = await createClient();

  const [artist, venue, events, saved, follows, threads, calls] = await Promise.all([
    supabase.from("artists").select("*").eq("profile_id", session.id).maybeSingle(),
    supabase.from("venues").select("*").eq("profile_id", session.id).maybeSingle(),
    supabase.from("events").select("*").eq("created_by", session.id),
    supabase
      .from("saved_events")
      .select("created_at, events ( id, title, starts_at, city )")
      .eq("profile_id", session.id),
    supabase
      .from("follows")
      .select("created_at, artist_id, venue_id")
      .eq("follower_id", session.id),
    supabase
      .from("booking_threads")
      .select(
        "id, subject, status, event_date, fee_text, reminder_at, created_at, last_message_at, booking_messages ( body, created_at, sender_id )"
      )
      .order("created_at", { ascending: false }),
    supabase.from("calls").select("*").eq("created_by", session.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    profile: {
      id: session.id,
      email: session.email,
      role: session.role,
      verified: session.verified,
    },
    artist: artist.data ?? null,
    venue: venue.data ?? null,
    events: events.data ?? [],
    saved_events: saved.data ?? [],
    follows: follows.data ?? [],
    bookings: threads.data ?? [],
    calls: calls.data ?? [],
    notes: "Le note private sono incluse nei thread a cui appartengono.",
  };

  const body = JSON.stringify(payload, null, 2);

  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="openstage-dati.json"',
      "cache-control": "no-store",
    },
  });
}
