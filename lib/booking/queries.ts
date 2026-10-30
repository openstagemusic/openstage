import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { createClient } from "@/lib/supabase/server";

export type BookingThreadSummary = {
  id: string;
  subject: string;
  eventDate: string | null;
  feeText: string | null;
  lastMessageAt: string;
  counterpartName: string;
  counterpartSlug: string;
  counterpartType: "artist" | "venue";
};

export type BookingMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type BookingThread = BookingThreadSummary & {
  artistId: string;
  venueId: string;
  artistProfileId: string | null;
  venueProfileId: string | null;
  messages: BookingMessage[];
};

type ThreadRow = {
  id: string;
  subject: string;
  event_date: string | null;
  fee_text: string | null;
  last_message_at: string;
  artist_id: string;
  venue_id: string;
  artists:
    | { name: string; slug: string; profile_id: string | null }
    | { name: string; slug: string; profile_id: string | null }[]
    | null;
  venues:
    | { name: string; slug: string; profile_id: string | null }
    | { name: string; slug: string; profile_id: string | null }[]
    | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** I thread del profilo, dal più recente. */
export async function listBookingThreads(
  profileId: string,
  role: "artist" | "venue"
): Promise<BookingThreadSummary[]> {
  const supabase = await createClient();
  const page = role === "artist" ? await getArtistByProfileId(profileId) : await getVenueByProfileId(profileId);
  if (!page) return [];

  let query = supabase
    .from("booking_threads")
    .select(
      "id, subject, event_date, fee_text, last_message_at, artist_id, venue_id, artists ( name, slug, profile_id ), venues ( name, slug, profile_id )"
    )
    .order("last_message_at", { ascending: false });

  query = role === "artist" ? query.eq("artist_id", page.id) : query.eq("venue_id", page.id);

  const { data, error } = await query;

  if (error) {
    console.error("[booking] listBookingThreads:", error.message);
    return [];
  }

  return ((data as unknown as ThreadRow[] | null) ?? []).flatMap((row) => {
    const artist = one(row.artists);
    const venue = one(row.venues);
    const counterpart = role === "artist" ? venue : artist;
    if (!counterpart) return [];

    return [
      {
        id: row.id,
        subject: row.subject,
        eventDate: row.event_date,
        feeText: row.fee_text,
        lastMessageAt: row.last_message_at,
        counterpartName: counterpart.name,
        counterpartSlug: counterpart.slug,
        counterpartType: role === "artist" ? "venue" : "artist",
      },
    ];
  });
}

/** Un thread con i messaggi; la RLS impedisce di aprire thread altrui. */
export async function getBookingThread(
  threadId: string,
  role: "artist" | "venue"
): Promise<BookingThread | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_threads")
    .select(
      "id, subject, event_date, fee_text, last_message_at, artist_id, venue_id, artists ( name, slug, profile_id ), venues ( name, slug, profile_id )"
    )
    .eq("id", threadId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[booking] getBookingThread:", error.message);
    return null;
  }

  const row = data as unknown as ThreadRow;
  const artist = one(row.artists);
  const venue = one(row.venues);
  const counterpart = role === "artist" ? venue : artist;
  if (!artist || !venue || !counterpart) return null;

  const { data: messages, error: messagesError } = await supabase
    .from("booking_messages")
    .select("id, sender_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("[booking] getBookingThread messages:", messagesError.message);
    return null;
  }

  return {
    id: row.id,
    subject: row.subject,
    eventDate: row.event_date,
    feeText: row.fee_text,
    lastMessageAt: row.last_message_at,
    counterpartName: counterpart.name,
    counterpartSlug: counterpart.slug,
    counterpartType: role === "artist" ? "venue" : "artist",
    artistId: row.artist_id,
    venueId: row.venue_id,
    artistProfileId: artist.profile_id,
    venueProfileId: venue.profile_id,
    messages: ((messages as Array<{ id: string; sender_id: string; body: string; created_at: string }> | null) ?? []).map(
      (message) => ({
        id: message.id,
        senderId: message.sender_id,
        body: message.body,
        createdAt: message.created_at,
      })
    ),
  };
}

/** La scheda da contattare, con il profilo proprietario. */
export async function getBookingTarget(
  type: "artist" | "venue",
  id: string
): Promise<{ id: string; name: string; slug: string; profileId: string | null } | null> {
  const supabase = await createClient();
  const table = type === "artist" ? "artists" : "venues";
  const { data, error } = await supabase
    .from(table)
    .select("id, name, slug, profile_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[booking] getBookingTarget:", error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    profileId: data.profile_id,
  };
}

/** I due profili del thread, per capire chi ha scritto. */
export async function getBookingParticipants(threadId: string): Promise<{
  artistProfileId: string | null;
  venueProfileId: string | null;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_threads")
    .select("artists ( profile_id ), venues ( profile_id )")
    .eq("id", threadId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[booking] participants:", error.message);
    return null;
  }

  const row = data as unknown as {
    artists: { profile_id: string | null } | { profile_id: string | null }[] | null;
    venues: { profile_id: string | null } | { profile_id: string | null }[] | null;
  };

  return {
    artistProfileId: one(row.artists)?.profile_id ?? null,
    venueProfileId: one(row.venues)?.profile_id ?? null,
  };
}
