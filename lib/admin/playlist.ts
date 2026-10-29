import { createClient } from "@/lib/supabase/server";

export type PlaylistSubmissionStatus = "pending" | "added" | "hidden";

export type AdminPlaylistSubmission = {
  artistId: string;
  name: string;
  slug: string;
  city: string | null;
  trackUrl: string;
  trackTitle: string | null;
  status: PlaylistSubmissionStatus;
  submittedAt: string | null;
  addedAt: string | null;
};

type Row = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  playlist_track_url: string | null;
  playlist_track_title: string | null;
  playlist_track_status: string | null;
  playlist_track_submitted_at: string | null;
  playlist_track_added_at: string | null;
};

/** Le tracce proposte dagli artisti, dalla più recente. */
export async function listPlaylistSubmissions(): Promise<AdminPlaylistSubmission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artists")
    .select(
      "id, name, slug, city, playlist_track_url, playlist_track_title, playlist_track_status, playlist_track_submitted_at, playlist_track_added_at"
    )
    .not("playlist_track_url", "is", null)
    .order("playlist_track_submitted_at", { ascending: false });

  if (error) {
    console.error("[admin] listPlaylistSubmissions:", error.message);
    return [];
  }

  return ((data as Row[] | null) ?? []).flatMap((row) => {
    if (!row.playlist_track_url) return [];
    const status = row.playlist_track_status;

    return [
      {
        artistId: row.id,
        name: row.name,
        slug: row.slug,
        city: row.city,
        trackUrl: row.playlist_track_url,
        trackTitle: row.playlist_track_title,
        status:
          status === "added" || status === "hidden" || status === "pending"
            ? status
            : "pending",
        submittedAt: row.playlist_track_submitted_at,
        addedAt: row.playlist_track_added_at,
      },
    ];
  });
}
