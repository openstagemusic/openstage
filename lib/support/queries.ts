import { createClient } from "@/lib/supabase/server";

/**
 * I messaggi che l'utente ha mandato dal modulo contatti, con le risposte.
 *
 * La RLS fa il lavoro: `contact_messages_select_own` e
 * `contact_message_replies_select_own` (migration `0077`) lasciano vedere solo
 * le righe la cui email è quella del profilo collegato. Qui non si filtra a
 * mano, così non c'è un secondo posto dove sbagliare.
 */

export type ContactReply = {
  id: string;
  body: string;
  sentAt: string;
};

export type ContactTicket = {
  id: string;
  /** Prima riga del messaggio: fa da titolo nella lista. */
  excerpt: string;
  body: string;
  topic: string;
  status: "new" | "read" | "closed";
  createdAt: string;
  readAt: string | null;
  closedAt: string | null;
  replies: ContactReply[];
};

type MessageRow = {
  id: string;
  topic: string;
  message: string;
  status: string;
  created_at: string;
  read_at: string | null;
  closed_at: string | null;
};

type ReplyRow = {
  id: string;
  message_id: string;
  body: string;
  sent_at: string;
};

export async function listMyContactTickets(): Promise<ContactTicket[]> {
  const supabase = await createClient();

  const { data: messages, error } = await supabase
    .from("contact_messages")
    .select("id, topic, message, status, created_at, read_at, closed_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[support] listMyContactTickets:", error.message);
    return [];
  }

  const rows = (messages as MessageRow[] | null) ?? [];
  if (rows.length === 0) return [];

  const { data: replies, error: repliesError } = await supabase
    .from("contact_message_replies")
    .select("id, message_id, body, sent_at")
    .in(
      "message_id",
      rows.map((row) => row.id)
    )
    .order("sent_at", { ascending: true });

  if (repliesError) console.error("[support] replies:", repliesError.message);

  const byMessage = new Map<string, ContactReply[]>();
  for (const reply of (replies as ReplyRow[] | null) ?? []) {
    const list = byMessage.get(reply.message_id) ?? [];
    list.push({ id: reply.id, body: reply.body, sentAt: reply.sent_at });
    byMessage.set(reply.message_id, list);
  }

  return rows.map((row) => {
    const firstLine = row.message.trim().split("\n")[0] ?? "";
    return {
      id: row.id,
      excerpt: firstLine.length > 80 ? `${firstLine.slice(0, 80)}…` : firstLine,
      body: row.message,
      topic: row.topic,
      status: (row.status === "read" || row.status === "closed" ? row.status : "new") as
        | "new"
        | "read"
        | "closed",
      createdAt: row.created_at,
      readAt: row.read_at,
      closedAt: row.closed_at,
      replies: byMessage.get(row.id) ?? [],
    };
  });
}
