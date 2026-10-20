"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Le azioni della moderazione (B40).
 *
 * Due famiglie, due permessi diversi:
 *
 *   * **segnalare** lo può fare chiunque abbia una sessione, una volta sola per
 *     serata, e mai la propria;
 *   * **decidere** (annullare, rimettere online, sospendere, unire) lo può fare
 *     solo l'admin. Il controllo qui è la seconda serratura: la prima è nella
 *     RLS, che vale anche se qualcuno chiama il database per conto suo.
 */

const REASONS = new Set(["fake", "wrong_info", "spam", "offensive", "other"]);
const NOTE_MAX = 500;

export type ReportOutcome = {
  ok: boolean;
  error?: "unauthorized" | "ownEvent" | "already" | "invalid" | "failed";
};

export async function reportEventAction(input: {
  eventId: string;
  reason: string;
  note?: string | null;
}): Promise<ReportOutcome> {
  const session = await getSessionProfile();

  if (!session) return { ok: false, error: "unauthorized" };
  if (!REASONS.has(input.reason)) return { ok: false, error: "invalid" };

  const note = input.note?.trim().slice(0, NOTE_MAX) || null;
  const supabase = await createClient();

  const { data: event, error: readError } = await supabase
    .from("events")
    .select("id, created_by")
    .eq("id", input.eventId)
    .maybeSingle();

  if (readError) {
    console.error("[moderation] reportEventAction (lettura):", readError.message);
    return { ok: false, error: "failed" };
  }

  if (!event) return { ok: false, error: "failed" };

  // Segnalare la propria serata non ha senso: sarebbe un modo di sparire.
  if (event.created_by === session.id) return { ok: false, error: "ownEvent" };

  const { error } = await supabase.from("reports").insert({
    event_id: input.eventId,
    reporter_id: session.id,
    reason: input.reason,
    note,
  });

  if (error) {
    // La chiave (evento + persona) ferma la seconda segnalazione.
    if (error.code === "23505") return { ok: false, error: "already" };

    console.error("[moderation] reportEventAction:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/eventi");

  return { ok: true };
}

export type ModerationOutcome = {
  ok: boolean;
  error?: "unauthorized" | "notFound" | "failed";
};

/** Annulla, rimette online o rimanda in bozza una serata (solo admin). */
export async function adminSetEventStatusAction(input: {
  eventId: string;
  status: "published" | "cancelled" | "draft";
}): Promise<ModerationOutcome> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status: input.status };

  // Rimettere online una serata in pausa significa anche chiudere la pausa:
  // altrimenti il prossimo caricamento la rimetterebbe in bozza.
  if (input.status === "published") {
    patch.auto_hidden_at = null;
    patch.auto_hidden_status = null;
  }

  const { error } = await supabase.from("events").update(patch).eq("id", input.eventId);

  if (error) {
    console.error("[moderation] adminSetEventStatusAction:", error.message);
    return { ok: false, error: "failed" };
  }

  // Una decisione chiude le segnalazioni aperte: non restano in coda per sempre.
  if (input.status !== "draft") {
    const session = await getSessionProfile();

    await supabase
      .from("reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: session?.id ?? null,
      })
      .eq("event_id", input.eventId)
      .eq("status", "open");
  }

  revalidatePath("/admin/eventi");
  revalidatePath("/admin");

  return { ok: true };
}

/** Sospende o riattiva un account (solo admin). */
export async function adminSuspendProfileAction(input: {
  profileId: string;
  suspend: boolean;
}): Promise<ModerationOutcome> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ suspended_at: input.suspend ? new Date().toISOString() : null })
    .eq("id", input.profileId);

  if (error) {
    console.error("[moderation] adminSuspendProfileAction:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/eventi");
  revalidatePath("/admin");

  return { ok: true };
}

/**
 * Unisce un doppione a una scheda che resta (solo admin).
 *
 * La destinazione si può incollare come indirizzo pubblico (`/it/eventi/...`),
 * come slug o come identificativo: chi modera non deve tradurre niente.
 */
export async function adminMergeAction(input: {
  sourceId: string;
  target: string;
}): Promise<ModerationOutcome> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const raw = input.target.trim();
  if (raw === "") return { ok: false, error: "notFound" };

  const supabase = await createClient();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let targetId: string | null = null;

  if (uuid.test(raw)) {
    targetId = raw;
  } else {
    // Dall'indirizzo si prende l'ultimo pezzo: lo slug.
    const slug = raw.split(/[?#]/)[0]!.replace(/\/+$/, "").split("/").pop() ?? "";

    const { data } = await supabase
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    targetId = data?.id ?? null;
  }

  if (!targetId || targetId === input.sourceId) return { ok: false, error: "notFound" };

  const { error } = await supabase.rpc("merge_event", {
    p_source: input.sourceId,
    p_target: targetId,
  });

  if (error) {
    console.error("[moderation] adminMergeAction:", error.message);
    return { ok: false, error: error.code === "P0002" ? "notFound" : "failed" };
  }

  revalidatePath("/admin/eventi");
  revalidatePath("/admin");

  return { ok: true };
}
