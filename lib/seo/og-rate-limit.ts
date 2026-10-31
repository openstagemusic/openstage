/**
 * Limite semplice per le rotte Open Graph.
 *
 * Le card sono pubbliche e costano: una lettura al database, un disegno canvas e
 * a volte il download della foto. La cache CDN (`s-maxage`) copre i crawler
 * normali; questo è il freno per chi insiste. È in memoria, quindi per istanza:
 * non è un firewall, è un limite di buon senso.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

export function allowOgRequest(request: Request, limit = 40): boolean {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Pulizia occasionale: la mappa non deve crescere per sempre.
    if (buckets.size > 2_000) {
      for (const [key, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(key);
      }
    }
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

export function tooManyRequests(): Response {
  return new Response("Troppe richieste", {
    status: 429,
    headers: { "retry-after": "60", "cache-control": "no-store" },
  });
}
