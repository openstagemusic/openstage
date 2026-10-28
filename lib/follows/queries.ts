import { createClient } from "@/lib/supabase/server";

export type FollowSubjectType = "artist" | "venue";

export type FollowedPage = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
};

export type FollowedPages = {
  artists: FollowedPage[];
  venues: FollowedPage[];
};

type FollowRow = {
  artist_id: string | null;
  venue_id: string | null;
  artists: { id: string; name: string; slug: string; city: string | null } | null;
  venues: { id: string; name: string; slug: string; city: string | null } | null;
};

export async function isFollowing(
  subjectType: FollowSubjectType,
  subjectId: string,
  profileId: string | null
): Promise<boolean> {
  if (!profileId) return false;

  const supabase = await createClient();
  const column = subjectType === "artist" ? "artist_id" : "venue_id";
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", profileId)
    .eq(column, subjectId)
    .maybeSingle();

  if (error) {
    console.error("[follows] isFollowing:", error.message);
    return false;
  }

  return Boolean(data);
}

/** Le schede seguite dal profilo, divise tra artisti e locali. */
export async function listFollowedPages(profileId: string): Promise<FollowedPages> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follows")
    .select(
      "artist_id, venue_id, artists ( id, name, slug, city ), venues ( id, name, slug, city )"
    )
    .eq("follower_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[follows] listFollowedPages:", error.message);
    return { artists: [], venues: [] };
  }

  const result: FollowedPages = { artists: [], venues: [] };

  for (const row of (data as unknown as FollowRow[] | null) ?? []) {
    if (row.artists) {
      result.artists.push({
        id: row.artists.id,
        name: row.artists.name,
        slug: row.artists.slug,
        city: row.artists.city,
      });
    }
    if (row.venues) {
      result.venues.push({
        id: row.venues.id,
        name: row.venues.name,
        slug: row.venues.slug,
        city: row.venues.city,
      });
    }
  }

  return result;
}

/** Solo il totale: la tabella dei follow resta privata. */
export async function getFollowCount(
  subjectType: FollowSubjectType,
  subjectId: string
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("follow_count", {
    p_subject_type: subjectType,
    p_subject_id: subjectId,
  });

  if (error) {
    console.error("[follows] getFollowCount:", error.message);
    return 0;
  }

  return typeof data === "number" ? data : 0;
}
