/**
 * Supabase environment access.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so referencing them through
 * literal names here is safe for the browser, the server and the edge runtime.
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * True only when the public Supabase configuration is present AND the URL is a
 * valid http(s) address.
 *
 * This guards against a malformed value (for example an API key accidentally
 * pasted into the URL variable) taking the entire app down: the Supabase
 * helpers are simply treated as "not configured" instead of throwing.
 */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_ANON_KEY.length > 0 && isValidHttpUrl(SUPABASE_URL);
}
