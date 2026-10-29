"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { createClient } from "@/lib/supabase/server";

export type PlaylistStatusResult = { ok: boolean; error?: string };

/**
 * Decide l'esito di una proposta per la playlist.
 *
 * `added` significa "l'ho messa su Spotify": l'aggiunta resta manuale, qui si
 * registra solo la decisione. Nessuna API di scrittura, nessun token.
 */
export async function setPlaylistSubmissionStatusAction(input: {
  artistId: string;
  status: "pending" | "added" | "hidden";
}): Promise<PlaylistStatusResult> {
  if (!(await isCurrentUserAdmin())) {
    return { ok: false, error: "forbidden" };
  }

  const artistId = input.artistId.trim();
  if (!artistId) return { ok: false, error: "invalid" };

  const status =
    input.status === "added" || input.status === "hidden" ? input.status : "pending";

  const supabase = await createClient();
  const { error } = await supabase
    .from("artists")
    .update({
      playlist_track_status: status,
      playlist_track_added_at: status === "added" ? new Date().toISOString() : null,
    })
    .eq("id", artistId)
    .not("playlist_track_url", "is", null);

  if (error) {
    console.error("[playlist] set status:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/playlist");
  revalidatePath("/admin");
  return { ok: true };
}
