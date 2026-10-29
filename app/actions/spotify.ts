"use server";

import { verifySpotifyLink, type SpotifyVerifyResult } from "@/lib/spotify/verify";
import { getSessionProfile } from "@/lib/supabase/session";

export type SpotifyCheckResult = SpotifyVerifyResult | { ok: false; reason: "auth" };

/**
 * Controllo dal form del profilo.
 *
 * Richiede una sessione: non deve diventare un proxy pubblico verso Spotify.
 * Il link viene normalizzato e poi verificato con l'oEmbed ufficiale.
 */
export async function checkSpotifyLinkAction(
  raw: string,
  expected: "any" | "track"
): Promise<SpotifyCheckResult> {
  const session = await getSessionProfile();
  if (!session) return { ok: false, reason: "auth" };

  const value = (raw ?? "").trim().slice(0, 300);
  if (!value) return { ok: false, reason: "invalid" };

  return verifySpotifyLink(value, expected === "track" ? "track" : "any");
}
