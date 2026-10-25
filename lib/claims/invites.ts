import { createClient } from "@/lib/supabase/server";

/**
 * Inviti a reclamare una scheda.
 *
 * Il token non passa mai da qui: il database conserva solo l'hash e il link
 * vive nell'email/notifica. Questa lettura serve solo all'admin.
 */

export type ClaimInviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type ClaimInvite = {
  id: string;
  subjectType: "artist" | "venue";
  subjectId: string;
  subjectName: string | null;
  subjectSlug: string | null;
  email: string;
  channel: "email" | "notification";
  status: ClaimInviteStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
};

type ClaimInviteRow = {
  id: string;
  subject_type: "artist" | "venue";
  artist_id: string | null;
  venue_id: string | null;
  email: string;
  channel: "email" | "notification";
  status: ClaimInviteStatus;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  artists: { name: string; slug: string } | null;
  venues: { name: string; slug: string } | null;
};

export async function listClaimInvites(limit = 100): Promise<ClaimInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("claim_invites")
    .select(
      "id, subject_type, artist_id, venue_id, email, channel, status, expires_at, created_at, accepted_at, revoked_at, artists ( name, slug ), venues ( name, slug )"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[claims] listClaimInvites:", error.message);
    return [];
  }

  return (data as unknown as ClaimInviteRow[]).map((row) => {
    const page = row.artists ?? row.venues;

    return {
      id: row.id,
      subjectType: row.subject_type,
      subjectId: (row.artist_id ?? row.venue_id) as string,
      subjectName: page?.name ?? null,
      subjectSlug: page?.slug ?? null,
      email: row.email,
      channel: row.channel,
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at,
      revokedAt: row.revoked_at,
    };
  });
}

export type ClaimInviteInfo = {
  valid: boolean;
  status: ClaimInviteStatus | "invalid";
  subjectType: "artist" | "venue" | null;
  name: string | null;
  slug: string | null;
  email: string | null;
  expiresAt: string | null;
};

export async function getClaimInviteInfo(token: string): Promise<ClaimInviteInfo> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_invite_info", { p_token: token });

  if (error || !data) {
    console.error("[claims] claim_invite_info:", error?.message);
    return {
      valid: false,
      status: "invalid",
      subjectType: null,
      name: null,
      slug: null,
      email: null,
      expiresAt: null,
    };
  }

  const raw = data as unknown as {
    valid: boolean;
    status: ClaimInviteStatus | "invalid";
    subjectType: "artist" | "venue" | null;
    name: string | null;
    slug: string | null;
    email: string | null;
    expiresAt: string | null;
  };

  return {
    valid: raw.valid,
    status: raw.status,
    subjectType: raw.subjectType ?? null,
    name: raw.name ?? null,
    slug: raw.slug ?? null,
    email: raw.email ?? null,
    expiresAt: raw.expiresAt ?? null,
  };
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;

  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}
