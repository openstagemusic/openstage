"use server";

import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Dopo il login l'admin deve finire nella control room, non nella Home.
 * Restituisce `/admin` solo per il ruolo admin; per gli altri nessuna deviazione.
 */
export async function resolveAdminDestinationAction(): Promise<string | null> {
  const session = await getSessionProfile();
  return session?.role === "admin" ? "/admin" : null;
}
