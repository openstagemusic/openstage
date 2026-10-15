import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "./env";

/**
 * Privileged client using the service role key.
 * NEVER import this module from a Client Component and NEVER expose the key.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return createSupabaseClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
