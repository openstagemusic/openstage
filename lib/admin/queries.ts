import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/auth/roles";

/**
 * Letture della control room.
 *
 * Regola: i numeri vengono dal database, mai da stime o dati di esempio. Le
 * funzioni `admin_*` ricontrollano `is_admin()` e le policy di riga lasciano
 * passare l'admin: qui non c'è una seconda verità.
 */

export type AdminMetrics = {
  generatedAt: string;
  usersTotal: number;
  usersFan: number;
  usersArtist: number;
  usersVenue: number;
  usersAdmin: number;
  usersSuspended: number;
  usersNewMonth: number;
  artistsTotal: number;
  artistsClaimed: number;
  artistsWithoutEvents: number;
  venuesTotal: number;
  venuesClaimed: number;
  venuesWithoutEvents: number;
  eventsPublished: number;
  eventsDraft: number;
  eventsCancelled: number;
  eventsUpcoming: number;
  eventsNewMonth: number;
  savedTotal: number;
  messagesNew: number;
  messagesOpen: number;
  reportsOpen: number;
  claimsPending: number;
  claimsToVerify: number;
  emailQueued: number;
  emailFailed: number;
};

export async function getAdminMetrics(): Promise<AdminMetrics | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_metrics");

  if (error || !data) {
    console.error("[admin] admin_metrics:", error?.message);
    return null;
  }

  return data as unknown as AdminMetrics;
}

export type AdminProfileLink = { name: string; slug: string };

export type AdminUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  city: string | null;
  createdAt: string;
  verifiedAt: string | null;
  suspendedAt: string | null;
  artist: AdminProfileLink | null;
  venue: AdminProfileLink | null;
};

type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  city: string | null;
  created_at: string;
  verified_at: string | null;
  suspended_at: string | null;
  artists: AdminProfileLink | null;
  venues: AdminProfileLink | null;
};

export async function listAdminUsers(limit = 300): Promise<AdminUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, city, created_at, verified_at, suspended_at, " +
        "artists ( name, slug ), venues ( name, slug )"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin] listAdminUsers:", error.message);
    return [];
  }

  return (data as unknown as AdminUserRow[]).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    city: row.city,
    createdAt: row.created_at,
    verifiedAt: row.verified_at,
    suspendedAt: row.suspended_at,
    artist: row.artists ?? null,
    venue: row.venues ?? null,
  }));
}

export type AdminDirectoryRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  genre: string | null;
  createdAt: string;
  claimed: boolean;
  verified: boolean;
  suspended: boolean;
  profileId: string | null;
  ownerEmail: string | null;
  eventCount: number;
};

type DirectoryRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  genre?: string | null;
  created_at: string;
  profile_id: string | null;
  profiles: { id: string; email: string | null; verified_at: string | null; suspended_at: string | null } | null;
  events: { count: number }[] | null;
};

async function listDirectory(
  table: "artists" | "venues",
  limit = 300
): Promise<AdminDirectoryRow[]> {
  const supabase = await createClient();
  const select =
    table === "artists"
      ? "id, name, slug, city, genre, created_at, profile_id, profiles!artists_profile_id_fkey ( id, email, verified_at, suspended_at ), events ( count )"
      : "id, name, slug, city, created_at, profile_id, profiles!venues_profile_id_fkey ( id, email, verified_at, suspended_at ), events ( count )";

  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[admin] listDirectory(${table}):`, error.message);
    return [];
  }

  return (data as unknown as DirectoryRow[]).map((row) => {
    const profile = row.profiles ?? null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: row.city,
      genre: row.genre ?? null,
      createdAt: row.created_at,
      claimed: row.profile_id !== null,
      verified: profile?.verified_at != null,
      suspended: profile?.suspended_at != null,
      profileId: profile?.id ?? null,
      ownerEmail: profile?.email ?? null,
      eventCount: row.events?.[0]?.count ?? 0,
    };
  });
}

export function listAdminArtists(limit = 300): Promise<AdminDirectoryRow[]> {
  return listDirectory("artists", limit);
}

export function listAdminVenues(limit = 300): Promise<AdminDirectoryRow[]> {
  return listDirectory("venues", limit);
}

export type AdminReport = {
  id: string;
  reason: string;
  note: string | null;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  reporterEmail: string | null;
  eventId: string;
  eventTitle: string | null;
  eventSlug: string | null;
  eventCity: string | null;
  eventStatus: string | null;
};

type ReportRow = {
  id: string;
  reason: string;
  note: string | null;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  event_id: string;
  reporter: { email: string | null } | null;
  events: { title: string; slug: string; city: string | null; status: string } | null;
};

export async function listAdminReports(limit = 200): Promise<AdminReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, reason, note, status, created_at, event_id, " +
        "reporter:profiles!reports_reporter_id_fkey ( email ), " +
        "events ( title, slug, city, status )"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin] listAdminReports:", error.message);
    return [];
  }

  return (data as unknown as ReportRow[]).map((row) => ({
    id: row.id,
    reason: row.reason,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    reporterEmail: row.reporter?.email ?? null,
    eventId: row.event_id,
    eventTitle: row.events?.title ?? null,
    eventSlug: row.events?.slug ?? null,
    eventCity: row.events?.city ?? null,
    eventStatus: row.events?.status ?? null,
  }));
}

export type AuditEntry = {
  id: string;
  action: string;
  subjectType: string | null;
  subjectId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorEmail: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  subject_type: string | null;
  subject_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: { email: string | null } | null;
};

export async function listAuditLog(limit = 150): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select(
      "id, action, subject_type, subject_id, metadata, created_at, " +
        "actor:profiles!admin_audit_log_actor_id_fkey ( email )"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin] listAuditLog:", error.message);
    return [];
  }

  return (data as unknown as AuditRow[]).map((row) => ({
    id: row.id,
    action: row.action,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    actorEmail: row.actor?.email ?? null,
  }));
}

export type AdminOwnerOption = {
  id: string;
  name: string;
  city: string | null;
};

/** Artisti e locali reali per il selettore "crea per conto di". */
export async function listOwnerOptions(): Promise<{
  artists: AdminOwnerOption[];
  venues: AdminOwnerOption[];
}> {
  const supabase = await createClient();
  const [artists, venues] = await Promise.all([
    supabase.from("artists").select("id, name, city").order("name", { ascending: true }).limit(1000),
    supabase.from("venues").select("id, name, city").order("name", { ascending: true }).limit(1000),
  ]);

  if (artists.error) console.error("[admin] listOwnerOptions artists:", artists.error.message);
  if (venues.error) console.error("[admin] listOwnerOptions venues:", venues.error.message);

  return {
    artists: (artists.data as unknown as AdminOwnerOption[]) ?? [],
    venues: (venues.data as unknown as AdminOwnerOption[]) ?? [],
  };
}
