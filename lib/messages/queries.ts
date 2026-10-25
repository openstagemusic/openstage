import { createClient } from "@/lib/supabase/server";

/**
 * I messaggi del modulo contatti, visti dall'admin.
 *
 * La tabella è scrivibile dal pubblico ma leggibile solo dall'admin: questa
 * query funziona perché la sessione porta con sé il ruolo giusto e la RLS fa il
 * resto. Nessun dato viene letto con la service role.
 */

export type ContactMessageStatus = "new" | "read" | "closed";

export type ContactPriority = "low" | "normal" | "high" | "urgent";

export type ContactTopic = "general" | "artist" | "venue" | "report" | "privacy" | "other";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  locale: "it" | "en";
  status: ContactMessageStatus;
  priority: ContactPriority;
  assignedTo: string | null;
  assignedEmail: string | null;
  createdAt: string;
  readAt: string | null;
  closedAt: string | null;
};

type Row = {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  locale: "it" | "en";
  status: ContactMessageStatus;
  priority: ContactPriority;
  assigned_to: string | null;
  assigned: { email: string | null } | null;
  created_at: string;
  read_at: string | null;
  closed_at: string | null;
};

const MESSAGE_SELECT =
  "id, name, email, topic, message, locale, status, priority, assigned_to, created_at, read_at, closed_at, " +
  "assigned:profiles!contact_messages_assigned_to_fkey ( email )";

function toMessage(row: Row): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    topic: row.topic,
    message: row.message,
    locale: row.locale,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    assignedEmail: row.assigned?.email ?? null,
    createdAt: row.created_at,
    readAt: row.read_at,
    closedAt: row.closed_at,
  };
}

/** Tutti i messaggi, dal più recente. L'admin li filtra nella pagina. */
export async function listContactMessages(limit = 200): Promise<ContactMessage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contact_messages")
    .select(MESSAGE_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[messages] listContactMessages:", error.message);
    return [];
  }

  return (data as unknown as Row[]).map(toMessage);
}

/** Quanti messaggi non sono ancora stati aperti: serve al link nell'admin. */
export async function countNewContactMessages(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  if (error) {
    console.error("[messages] countNewContactMessages:", error.message);
    return 0;
  }

  return count ?? 0;
}


export type ContactReply = {
  id: string;
  messageId: string;
  body: string;
  sentAt: string;
  adminEmail: string | null;
};

type ReplyRow = {
  id: string;
  message_id: string;
  body: string;
  sent_at: string;
  admin: { email: string | null } | null;
};

/** Lo storico delle risposte, dalla più vecchia alla più recente. */
export async function listContactReplies(limit = 1000): Promise<ContactReply[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_message_replies")
    .select("id, message_id, body, sent_at, admin:profiles!contact_message_replies_admin_id_fkey ( email )")
    .order("sent_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[messages] listContactReplies:", error.message);
    return [];
  }

  return (data as unknown as ReplyRow[]).map((row) => ({
    id: row.id,
    messageId: row.message_id,
    body: row.body,
    sentAt: row.sent_at,
    adminEmail: row.admin?.email ?? null,
  }));
}

/** Gli admin a cui si può assegnare un ticket. */
export async function listAdminAssignees(): Promise<Array<{ id: string; email: string | null }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("role", "admin")
    .order("email", { ascending: true });

  if (error) {
    console.error("[messages] listAdminAssignees:", error.message);
    return [];
  }

  return (data as unknown as Array<{ id: string; email: string | null }>) ?? [];
}
