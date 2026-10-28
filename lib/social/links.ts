import { parseSpotifyLink } from "@/lib/spotify/links";

/**
 * I link che una scheda può mostrare.
 *
 * Non c'è nessuna API e nessun servizio da configurare: sono URL pubblici che
 * l'artista o il locale incolla nel profilo. La normalizzazione serve a evitare
 * link rotti, schemi insicuri e indirizzi che non appartengono alla piattaforma
 * dichiarata (per esempio un "instagram" che punta altrove).
 */
export const SOCIAL_KINDS = [
  "website",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "soundcloud",
  "bandcamp",
  "linktree",
  "spotify",
] as const;

export type SocialKind = (typeof SOCIAL_KINDS)[number];

export type SocialUrls = Record<SocialKind, string | null>;

const HOSTS: Record<SocialKind, string[]> = {
  website: [],
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be", "m.youtube.com"],
  soundcloud: ["soundcloud.com"],
  bandcamp: ["bandcamp.com"],
  linktree: ["linktr.ee", "linktree.com"],
  spotify: ["open.spotify.com", "play.spotify.com"],
};

function stripHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

function hostAllowed(kind: SocialKind, host: string): boolean {
  if (kind === "website") return true;

  const allowed = HOSTS[kind];
  if (kind === "bandcamp") {
    // Gli artisti su Bandcamp vivono su sottodomini: artista.bandcamp.com.
    return stripHost(host) === "bandcamp.com" || stripHost(host).endsWith(".bandcamp.com");
  }

  return allowed.includes(stripHost(host));
}

const HANDLE = /^[A-Za-z0-9._-]{1,60}$/;

function fromHandle(kind: SocialKind, handle: string): string | null {
  if (!HANDLE.test(handle)) return null;

  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "tiktok") return `https://tiktok.com/@${handle}`;
  if (kind === "soundcloud") return `https://soundcloud.com/${handle}`;

  return null;
}

/**
 * Restituisce l'URL canonico, oppure `null` se non è valido per quel tipo.
 *
 * Accetta `@nomeutente` per Instagram, TikTok e SoundCloud; per gli altri serve
 * il link completo (con o senza `https://`).
 */
export function normalizeSocialUrl(kind: SocialKind, raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  if (kind === "spotify") {
    return parseSpotifyLink(value)?.url ?? null;
  }

  if (value.startsWith("@")) {
    return fromHandle(kind, value.slice(1).trim());
  }

  let parsed: URL;

  try {
    parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!hostAllowed(kind, parsed.hostname)) return null;

  // Sempre https e senza frammento: il frammento non serve a un profilo.
  parsed.protocol = "https:";
  parsed.hash = "";

  return parsed.toString();
}

/** Tutti i campi vuoti, utile come base. */
export function emptySocialUrls(): SocialUrls {
  return {
    website: null,
    instagram: null,
    facebook: null,
    tiktok: null,
    youtube: null,
    soundcloud: null,
    bandcamp: null,
    linktree: null,
    spotify: null,
  };
}

/** Almeno un link pubblico (Spotify incluso). */
export function hasAnySocialLink(urls: SocialUrls): boolean {
  return SOCIAL_KINDS.some((kind) => Boolean(urls[kind]));
}

export type SocialValidation = {
  urls: SocialUrls;
  /** I tipi che l'utente ha compilato male. */
  invalid: SocialKind[];
};

/** Valida in blocco i campi del form; i vuoti restano `null`. */
export function validateSocialLinks(
  input: Partial<Record<SocialKind, string | null | undefined>>
): SocialValidation {
  const urls = emptySocialUrls();
  const invalid: SocialKind[] = [];

  for (const kind of SOCIAL_KINDS) {
    const raw = input[kind];
    if (!raw || !raw.trim()) continue;

    const url = normalizeSocialUrl(kind, raw);
    if (url) {
      urls[kind] = url;
    } else {
      invalid.push(kind);
    }
  }

  return { urls, invalid };
}
