import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { parseSpotifyLink } from "./links";

export type SpotifyPlaylist = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  url: string;
  embedUrl: string;
  sortOrder: number;
};

type PlaylistRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  url: string;
  sort_order: number;
};

/**
 * Le playlist pubblicate della redazione. La tabella è leggibile da tutti ma
 * scrivibile solo dall'admin; qui si leggono solo le righe pubblicate.
 */
export const listPublishedPlaylists = cache(async (): Promise<SpotifyPlaylist[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spotify_playlists")
    .select("id, slug, title, description, url, sort_order")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[spotify] listPublishedPlaylists:", error.message);
    return [];
  }

  return ((data as PlaylistRow[] | null) ?? []).flatMap((row) => {
    // Una riga con link non valido non deve rompere la pagina: si salta.
    const link = parseSpotifyLink(row.url);
    if (!link || link.kind !== "playlist") return [];

    return [
      {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        url: link.url,
        embedUrl: link.embedUrl,
        sortOrder: row.sort_order,
      },
    ];
  });
});

/** La playlist del dock: la prima pubblicata, se c'è. */
export const getFeaturedPlaylist = cache(async (): Promise<SpotifyPlaylist | null> => {
  const playlists = await listPublishedPlaylists();
  return playlists[0] ?? null;
});

export type PlaylistSubmissionStatus = "pending" | "added" | "hidden";

export type PlaylistSubmission = {
  url: string;
  title: string | null;
  status: PlaylistSubmissionStatus;
  submittedAt: string | null;
  addedAt: string | null;
};

/** La proposta di un artista per la playlist, se c'è. */
export async function getArtistPlaylistSubmission(
  artistId: string
): Promise<PlaylistSubmission | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artists")
    .select(
      "playlist_track_url, playlist_track_title, playlist_track_status, playlist_track_submitted_at, playlist_track_added_at"
    )
    .eq("id", artistId)
    .maybeSingle();

  if (error) {
    console.error("[spotify] getArtistPlaylistSubmission:", error.message);
    return null;
  }

  if (!data?.playlist_track_url || !data.playlist_track_status) return null;

  return {
    url: data.playlist_track_url,
    title: data.playlist_track_title ?? null,
    status: data.playlist_track_status as PlaylistSubmissionStatus,
    submittedAt: data.playlist_track_submitted_at ?? null,
    addedAt: data.playlist_track_added_at ?? null,
  };
}
