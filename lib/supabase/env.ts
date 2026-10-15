/**
 * Supabase environment access.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so referencing them through
 * literal names here is safe for both the browser and the server.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the public Supabase configuration is available. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
