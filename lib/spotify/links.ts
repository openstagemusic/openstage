/**
 * Link Spotify: solo ciò che serve all'embed pubblico.
 *
 * Nessuna chiamata alla Web API, nessun Client ID: un link valido diventa un
 * iframe. Il formato accettato è quello che un artista copia dal browser o
 * dall'app (open.spotify.com/..., con eventuale prefisso `/intl-xx/`, oppure
 * `spotify:artist:ID`); tutto il resto viene rifiutato.
 */

export const SPOTIFY_KINDS = ["artist", "album", "track", "playlist"] as const;

export type SpotifyKind = (typeof SPOTIFY_KINDS)[number];

export type SpotifyLink = {
  kind: SpotifyKind;
  id: string;
  /** URL canonico, senza parametri: è quello che salviamo nel database. */
  url: string;
  embedUrl: string;
};

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

function isSpotifyKind(value: string | undefined): value is SpotifyKind {
  return SPOTIFY_KINDS.includes(value as SpotifyKind);
}

/** `null` se il link non è Spotify o non contiene un ID valido. */
export function parseSpotifyLink(raw: string | null | undefined): SpotifyLink | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  let kind: string | undefined;
  let id: string | undefined;

  if (/^spotify:/i.test(value)) {
    const [, rawKind, rawId] = value.split(":");
    kind = rawKind?.toLowerCase();
    id = rawId;
  } else {
    let parsed: URL;

    try {
      parsed = new URL(value.startsWith("//") ? `https:${value}` : value);
    } catch {
      return null;
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

    const host = parsed.hostname.toLowerCase();
    if (host !== "open.spotify.com" && host !== "play.spotify.com") return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const offset = parts[0]?.toLowerCase().startsWith("intl-") ? 1 : 0;
    kind = parts[offset]?.toLowerCase();
    id = parts[offset + 1];
  }

  if (!isSpotifyKind(kind) || !id || !SPOTIFY_ID.test(id)) return null;

  const url = `https://open.spotify.com/${kind}/${id}`;

  return {
    kind,
    id,
    url,
    embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`,
  };
}

/** Altezza consigliata da Spotify per l'embed. */
export function spotifyEmbedHeight(kind: SpotifyKind): number {
  return kind === "track" ? 152 : 352;
}
