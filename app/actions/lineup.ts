"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { createClient } from "@/lib/supabase/server";

export type JoinDecisionResult = { ok: boolean; error?: "unauthorized" | "failed" };

/**
 * Approva o rifiuta una richiesta di ingresso in lineup.
 *
 * La scrittura in `event_artists` e la notifica all'artista stanno dentro la
 * funzione SQL `decide_event_join_request`: qui si controlla solo che a
 * chiedere sia l'admin. Se la funzione fallisce, la richiesta resta in attesa.
 */
export async function decideJoinRequestAction(input: {
  id: string;
  approve: boolean;
}): Promise<JoinDecisionResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };
  if (!input.id) return { ok: false, error: "failed" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_event_join_request", {
    p_id: input.id,
    p_approve: input.approve,
  });

  if (error) {
    console.error("[lineup] decide:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/richieste-lineup");
  revalidatePath("/admin");
  return { ok: true };
}
