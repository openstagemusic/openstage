"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { sendContactReply } from "@/lib/email";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import type { ContactMessageStatus, ContactPriority } from "@/lib/messages/queries";
import { draftReplyForTicket } from "@/lib/ai/tasks/draft-reply";
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
const PRIORITIES = new Set<ContactPriority>(["low", "normal", "high", "urgent"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MessageOutcome = {
  ok: boolean;
  error?: "unauthorized" | "invalid" | "failed";
};

export async function adminUpdateTicketAction(input: {
  messageId: string;
  priority: ContactPriority;
  assignedTo: string | null;
}): Promise<MessageOutcome> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  if (
    !UUID.test(input.messageId) ||
    !PRIORITIES.has(input.priority) ||
    (input.assignedTo !== null && !UUID.test(input.assignedTo))
  ) {
    return { ok: false, error: "invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_contact_ticket", {
    p_message_id: input.messageId,
    p_priority: input.priority,
    p_assigned_to: input.assignedTo,
  });

  if (error) {
    console.error("[messages] adminUpdateTicketAction:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/messaggi");
  revalidatePath("/admin");

  return { ok: true };
}

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

/** Risposta integrata: l'admin scrive qui e il messaggio parte da Resend. */
export async function adminReplyToMessageAction(input: {
  messageId: string;
  body: string;
}): Promise<MessageOutcome> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const body = input.body.trim();
  if (!UUID.test(input.messageId) || body.length < 10 || body.length > 4000) {
    return { ok: false, error: "invalid" };
  }

  const supabase = await createClient();
  const { data: message, error: readError } = await supabase
    .from("contact_messages")
    .select("id, name, email, topic, locale, status, read_at")
    .eq("id", input.messageId)
    .maybeSingle();

  if (readError || !message) {
    if (readError) console.error("[messages] reply read:", readError.message);
    return { ok: false, error: "failed" };
  }

  const locale: Locale = message.locale === "en" ? "en" : "it";
  const dict = getDictionary(locale);
  const topicLabel =
    dict.pages.contact.topics[message.topic as keyof typeof dict.pages.contact.topics] ??
    message.topic;

  const sent = await sendContactReply({
    to: message.email,
    name: message.name,
    topic: topicLabel,
    body,
  });

  if (!sent) return { ok: false, error: "failed" };

  // L'email è partita: ora si registra la risposta, si aggiorna il ticket e,
  // se l'indirizzo ha un account, si crea la notifica in-app.
  const { error: logError } = await supabase.rpc("admin_log_contact_reply", {
    p_message_id: message.id,
    p_body: body,
  });

  if (logError) console.error("[messages] reply log:", logError.message);

  revalidatePath("/admin/messaggi");
  revalidatePath("/admin");

  return { ok: true };
}

export type AiDraftOutcome = {
  ok: boolean;
  reply?: string;
  error?: "unauthorized" | "invalid" | "not_configured" | "budget" | "failed";
};

/** Bozza AI per un ticket: nessun invio, l'admin la modifica e decide. */
export async function draftReplyAction(input: {
  messageId: string;
}): Promise<AiDraftOutcome> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };
  if (!UUID.test(input.messageId)) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { data: message, error } = await supabase
    .from("contact_messages")
    .select("id, message, topic, locale")
    .eq("id", input.messageId)
    .maybeSingle();

  if (error || !message) {
    if (error) console.error("[messages] draftReply read:", error.message);
    return { ok: false, error: "failed" };
  }

  return draftReplyForTicket({
    messageId: message.id,
    message: message.message,
    topic: message.topic,
    locale: message.locale === "en" ? "en" : "it",
  });
}
