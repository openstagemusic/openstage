"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import type { ContactMessageStatus } from "@/lib/messages/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Le azioni sui messaggi del modulo contatti (solo admin).
 *
 * La RLS è la prima serratura: `contact_messages` è aggiornabile solo da
 * `is_admin()`. Qui c'è la seconda, così l'interfaccia non prova nemmeno a
 * scrivere quando la sessione non è quella giusta.
 *
 * Gli stati sono tre e bastano: `new` (non ancora aperto), `read` (letto) e
 * `closed` (gestito). Riaprire riporta a `new`, senza cancellare il messaggio:
 * la cronologia resta nel database.
 */

const STATUSES = new Set<ContactMessageStatus>(["new", "read", "closed"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MessageOutcome = {
  ok: boolean;
  error?: "unauthorized" | "invalid" | "failed";
};

export async function adminSetMessageStatusAction(input: {
  messageId: string;
  status: ContactMessageStatus;
}): Promise<MessageOutcome> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  if (!UUID.test(input.messageId) || !STATUSES.has(input.status)) {
    return { ok: false, error: "invalid" };
  }

  const now = new Date().toISOString();
  const patch: {
    status: ContactMessageStatus;
    read_at: string | null;
    closed_at: string | null;
  } = {
    status: input.status,
    read_at: input.status === "new" ? null : now,
    closed_at: input.status === "closed" ? now : null,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .update(patch)
    .eq("id", input.messageId);

  if (error) {
    console.error("[messages] adminSetMessageStatusAction:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/messaggi");
  revalidatePath("/admin");

  return { ok: true };
}
