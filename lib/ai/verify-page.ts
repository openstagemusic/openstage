import { checkPublicUrl } from "@/lib/ai/fetch-public";

export type VerificationCheckCode =
  | "email"
  | "proof_reachable"
  | "proof_https"
  | "city"
  | "address"
  | "coordinates"
  | "website_reachable"
  | "spotify"
  | "events";

export type VerificationCheck = {
  code: VerificationCheckCode;
  ok: boolean;
  detail: string | null;
};

export type VerificationReport = {
  checks: VerificationCheck[];
  score: number;
  passed: number;
  total: number;
};

function safeUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Controlli deterministici, prima dell'AI.
 *
 * Non decidono nulla: producono solo un elenco di prove presenti/mancanti.
 * Un link che non risponde non è automaticamente falso: può essere protetto,
 * lento o richiedere login. Per questo il punteggio è un'indicazione.
 */
export async function collectVerificationChecks(input: {
  subjectType: "artist" | "venue";
  email: string | null;
  proofUrl: string;
  city: string | null;
  genre: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  spotifyUrl: string | null;
  eventCount: number;
}): Promise<VerificationReport> {
  const proof = safeUrl(input.proofUrl);
  const website = safeUrl(input.website);

  const [proofCheck, websiteCheck] = await Promise.all([
    proof ? checkPublicUrl(input.proofUrl) : Promise.resolve({ ok: false, status: null, error: "invalid_url" }),
    website ? checkPublicUrl(input.website as string) : Promise.resolve({ ok: false, status: null, error: "missing" }),
  ]);

  const checks: VerificationCheck[] = [
    {
      code: "email",
      ok: Boolean(input.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)),
      detail: input.email ? input.email.split("@")[1] ?? null : null,
    },
    {
      code: "proof_https",
      ok: proof?.protocol === "https:",
      detail: proof?.protocol ?? null,
    },
    {
      code: "proof_reachable",
      ok: proofCheck.ok,
      detail: proofCheck.error,
    },
    {
      code: "city",
      ok: Boolean(input.city?.trim()),
      detail: input.city,
    },
    {
      code: "events",
      ok: input.eventCount > 0,
      detail: String(input.eventCount),
    },
  ];

  if (input.subjectType === "venue") {
    const addressCheck: VerificationCheck = {
      code: "address",
      ok: Boolean(input.address?.trim()),
      detail: input.address,
    };

    checks.push(
      addressCheck,
      {
        code: "coordinates",
        ok: input.latitude != null && input.longitude != null,
        detail:
          input.latitude != null && input.longitude != null
            ? `${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)}`
            : null,
      },
      {
        code: "website_reachable",
        ok: websiteCheck.ok,
        detail: websiteCheck.error,
      }
    );
  } else {
    checks.push({
      code: "spotify",
      ok: Boolean(input.spotifyUrl && safeUrl(input.spotifyUrl)?.hostname.endsWith("spotify.com")),
      detail: input.spotifyUrl ? safeUrl(input.spotifyUrl)?.hostname ?? null : null,
    });
  }

  const passed = checks.filter((check) => check.ok).length;
  const total = checks.length;

  return {
    checks,
    passed,
    total,
    score: total > 0 ? Math.round((passed / total) * 100) : 0,
  };
}
