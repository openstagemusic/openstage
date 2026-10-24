"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Disiscrizione dal digest senza login: il token è l'unica chiave. */
export async function unsubscribeDigestAction(token: string): Promise<{ ok: boolean }> {
  if (!UUID.test(token)) return { ok: false };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("unsubscribe_email_digest", { p_token: token });

    if (error) {
      console.error("[unsubscribe] rpc:", error.message);
      return { ok: false };
    }

    return { ok: data === true };
  } catch (error) {
    console.error("[unsubscribe]", error instanceof Error ? error.message : error);
    return { ok: false };
  }
}
