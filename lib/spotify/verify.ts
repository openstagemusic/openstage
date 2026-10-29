import { parseSpotifyLink, type SpotifyKind } from "./links";

export type SpotifyVerifyFailure = "invalid" | "wrong_kind" | "not_found" | "unavailable";

export type SpotifyVerifyResult =
  | { ok: true; url: string; kind: SpotifyKind; title: string | null }
  | { ok: false; reason: SpotifyVerifyFailure };

/**
 * Verifica che il link Spotify esista davvero.
 *
 * Il formato lo controlla `parseSpotifyLink`; l'esistenza la dice l'oEmbed
 * pubblico di Spotify (404 = non esiste). Nessuna chiave, nessun token.
 * Un errore di rete non viene trattato come "link rotto": il chiamante decide
 * se bloccare o avvisare.
 */
export async function verifySpotifyLink(
  raw: string,
  expected: "any" | "track"
): Promise<SpotifyVerifyResult> {
  const link = parseSpotifyLink(raw);
  if (!link) return { ok: false, reason: "invalid" };
  if (expected === "track" && link.kind !== "track") {
    return { ok: false, reason: "wrong_kind" };
  }

  try {
    const response = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: { accept: "application/json" },
      }
    );

    if (response.status === 404) return { ok: false, reason: "not_found" };
    if (!response.ok) return { ok: false, reason: "unavailable" };

    const data = (await response.json()) as { title?: unknown };
    const title = typeof data.title === "string" ? data.title.trim().slice(0, 300) : null;

    return { ok: true, url: link.url, kind: link.kind, title: title || null };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
