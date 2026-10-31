import { createClient } from "@/lib/supabase/server";

/**
 * Bacheca ingaggi.
 *
 * Una chiamata è un annuncio verificato con compenso dichiarato. Le
 * candidature non vivono qui: sono thread di booking collegati tramite
 * `booking_threads.call_id`.
 */

export type CallRole = "artist" | "band" | "dj" | "performer" | "technician" | "other";

export type CallCompensation = "paid" | "door_split" | "unpaid" | "tbd";

export type CallStatus = "open" | "closed";

export type CallOwner = {
  type: "venue" | "artist";
  name: string;
  slug: string;
  avatarUrl: string | null;
};

export type PublicCall = {
  id: string;
  title: string;
  body: string;
  roleWanted: CallRole;
  city: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  feeText: string | null;
  compensation: CallCompensation;
  maxApplications: number;
  status: CallStatus;
  expiresAt: string;
  closedAt: string | null;
  createdAt: string;
  owner: CallOwner;
  applications: number;
};

export type CallApplication = {
  id: string;
  counterpartName: string;
  counterpartSlug: string;
  status: string;
  lastMessageAt: string;
};

type CallRow = {
  id: string;
  title: string;
  body: string;
  role_wanted: CallRole;
  city: string | null;
  period_start: string | null;
  period_end: string | null;
  fee_text: string | null;
  compensation: CallCompensation;
  max_applications: number;
  status: CallStatus;
  expires_at: string;
  closed_at: string | null;
  created_at: string;
  venue_id: string | null;
  artist_id: string | null;
  venues: { name: string; slug: string; avatar_url: string | null } | { name: string; slug: string; avatar_url: string | null }[] | null;
  artists: { name: string; slug: string; avatar_url: string | null } | { name: string; slug: string; avatar_url: string | null }[] | null;
};

const CALL_SELECT =
  "id, title, body, role_wanted, city, period_start, period_end, fee_text, compensation, max_applications, status, expires_at, closed_at, created_at, venue_id, artist_id, venues ( name, slug, avatar_url ), artists ( name, slug, avatar_url )";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toCall(row: CallRow, applications = 0): PublicCall | null {
  const venue = one(row.venues);
  const artist = one(row.artists);
  const owner = venue
    ? { type: "venue" as const, name: venue.name, slug: venue.slug, avatarUrl: venue.avatar_url }
    : artist
      ? { type: "artist" as const, name: artist.name, slug: artist.slug, avatarUrl: artist.avatar_url }
      : null;

  if (!owner) return null;

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    roleWanted: row.role_wanted,
    city: row.city,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    feeText: row.fee_text,
    compensation: row.compensation,
    maxApplications: row.max_applications,
    status: row.status,
    expiresAt: row.expires_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    owner,
    applications,
  };
}

async function countApplications(callIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (callIds.length === 0) return counts;

  const supabase = await createClient();
  const { data } = await supabase.from("booking_threads").select("call_id").in("call_id", callIds);

  for (const row of (data as { call_id: string | null }[] | null) ?? []) {
    if (!row.call_id) continue;
    counts.set(row.call_id, (counts.get(row.call_id) ?? 0) + 1);
  }

  return counts;
}

/** Le chiamate aperte e non scadute, dalla più recente. */
export async function listOpenCalls(filters: {
  city?: string | null;
  role?: CallRole | null;
  limit?: number;
  offset?: number;
} = {}): Promise<PublicCall[]> {
  const supabase = await createClient();

  let query = supabase
    .from("calls")
    .select(CALL_SELECT)
    .eq("status", "open")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 12);

  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 12) - 1);

  if (filters.city) query = query.eq("city", filters.city);
  if (filters.role) query = query.eq("role_wanted", filters.role);

  const { data, error } = await query;

  if (error) {
    console.error("[calls] listOpenCalls:", error.message);
    return [];
  }

  const rows = (data as unknown as CallRow[] | null) ?? [];
  const counts = await countApplications(rows.map((row) => row.id));

  return rows.flatMap((row) => {
    const call = toCall(row, counts.get(row.id) ?? 0);
    return call ? [call] : [];
  });
}

/** Le chiamate del profilo, comprese chiuse e scadute. */
export async function listMyCalls(profileId: string): Promise<PublicCall[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calls")
    .select(CALL_SELECT)
    .eq("created_by", profileId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[calls] listMyCalls:", error.message);
    return [];
  }

  const rows = (data as unknown as CallRow[] | null) ?? [];
  const counts = await countApplications(rows.map((row) => row.id));

  return rows.flatMap((row) => {
    const call = toCall(row, counts.get(row.id) ?? 0);
    return call ? [call] : [];
  });
}

/** Una chiamata: la RLS decide se si può vedere (aperta, propria, admin). */
export async function getCall(id: string): Promise<PublicCall | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("calls").select(CALL_SELECT).eq("id", id).maybeSingle();

  if (error || !data) {
    if (error) console.error("[calls] getCall:", error.message);
    return null;
  }

  const counts = await countApplications([id]);

  return toCall(data as unknown as CallRow, counts.get(id) ?? 0);
}

/** Id delle chiamate a cui questo profilo si è già candidato. */
export async function listAppliedCallIds(profileId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_threads")
    .select("call_id")
    .eq("created_by", profileId)
    .not("call_id", "is", null);

  return new Set(
    ((data as { call_id: string | null }[] | null) ?? [])
      .map((row) => row.call_id)
      .filter((value): value is string => Boolean(value))
  );
}

/** Le candidature ricevute su una chiamata: sono thread di booking. */
export async function listCallApplications(callId: string): Promise<CallApplication[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("booking_threads")
    .select(
      "id, status, last_message_at, artists ( name, slug ), venues ( name, slug )"
    )
    .eq("call_id", callId)
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("[calls] listCallApplications:", error.message);
    return [];
  }

  type Row = {
    id: string;
    status: string;
    last_message_at: string;
    artists: { name: string; slug: string } | { name: string; slug: string }[] | null;
    venues: { name: string; slug: string } | { name: string; slug: string }[] | null;
  };

  return ((data as unknown as Row[] | null) ?? []).flatMap((row) => {
    const artist = one(row.artists);
    const venue = one(row.venues);
    // Chi ha pubblicato la chiamata non è il candidato: mostriamo l'altro lato.
    const counterpart = row.venues && !row.artists ? venue : artist ?? venue;
    if (!counterpart) return [];

    return [
      {
        id: row.id,
        counterpartName: counterpart.name,
        counterpartSlug: counterpart.slug,
        status: row.status,
        lastMessageAt: row.last_message_at,
      },
    ];
  });
}


/** Quante chiamate sono aperte adesso. Serve alla fascia in Home. */
export async function countOpenCalls(
  filters: { role?: CallRole | null; city?: string | null } = {}
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from("calls")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .gt("expires_at", new Date().toISOString());

  if (filters.role) query = query.eq("role_wanted", filters.role);
  if (filters.city) query = query.eq("city", filters.city);

  const { count, error } = await query;

  if (error) {
    console.error("[calls] countOpenCalls:", error.message);
    return 0;
  }

  return count ?? 0;
}
