import { createClient } from "@/lib/supabase/server";

/**
 * I messaggi del modulo contatti, visti dall'admin.
 *
 * La tabella è scrivibile dal pubblico ma leggibile solo dall'admin: questa
 * query funziona perché la sessione porta con sé il ruolo giusto e la RLS fa il
 * resto. Nessun dato viene letto con la service role.
 */

export type ContactMessageStatus = "new" | "read" | "closed";

export type ContactTopic = "general" | "artist" | "venue" | "report" | "privacy" | "other";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  locale: "it" | "en";
  status: ContactMessageStatus;
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
  created_at: string;
  read_at: string | null;
  closed_at: string | null;
};

const MESSAGE_SELECT =
  "id, name, email, topic, message, locale, status, created_at, read_at, closed_at";

function toMessage(row: Row): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    topic: row.topic,
    message: row.message,
    locale: row.locale,
    status: row.status,
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
