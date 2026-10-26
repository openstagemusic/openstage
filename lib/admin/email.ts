import { createClient } from "@/lib/supabase/server";

/**
 * Dati del pannello comunicazione.
 *
 * Nessun corpo email viene mostrato o esportato: soggetto, destinatario,
 * categoria, stato e tentativi bastano per gestire la coda. Le policy RLS
 * lasciano leggere solo all'admin.
 */

export type EmailCategory = "auth" | "transactional" | "digest" | "optional";
export type EmailQueueStatus = "pending" | "sending" | "sent" | "failed" | "cancelled";
export type EmailLogStatus = "sent" | "failed" | "delivered" | "bounced" | "complained";

export type EmailStats = {
  queued: number;
  sending: number;
  failed: number;
  cancelled: number;
  sentToday: number;
  sentMonth: number;
  failedToday: number;
  deliveredMonth: number;
  bouncedMonth: number;
  complainedMonth: number;
  byCategory: Record<string, number>;
};

export async function getEmailStats(): Promise<EmailStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_email_stats");

  if (error || !data) {
    console.error("[email] admin_email_stats:", error?.message);
    return null;
  }

  return data as unknown as EmailStats;
}

export type EmailQueueRow = {
  id: string;
  to: string;
  subject: string;
  category: EmailCategory;
  status: EmailQueueStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
  batchId: string | null;
  recipientCount: number;
};

type QueueDbRow = {
  id: string;
  to_email: string;
  subject: string;
  category: EmailCategory;
  status: EmailQueueStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  batch_id: string | null;
  recipient_count: number;
};

export async function listEmailQueue(limit = 300): Promise<EmailQueueRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_queue")
    .select(
      "id, to_email, subject, category, status, attempts, max_attempts, next_attempt_at, last_error, created_at, sent_at, batch_id, recipient_count"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[email] listEmailQueue:", error.message);
    return [];
  }

  return (data as unknown as QueueDbRow[]).map((row) => ({
    id: row.id,
    to: row.to_email,
    subject: row.subject,
    category: row.category,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    batchId: row.batch_id,
    recipientCount: row.recipient_count,
  }));
}

export type EmailLogRow = {
  id: string;
  queueId: string | null;
  to: string;
  subject: string;
  category: string;
  status: EmailLogStatus;
  providerId: string | null;
  error: string | null;
  batchId: string | null;
  recipientCount: number;
  createdAt: string;
};

type LogDbRow = {
  id: string;
  queue_id: string | null;
  to_email: string;
  subject: string;
  category: string;
  status: EmailLogStatus;
  provider_id: string | null;
  error: string | null;
  batch_id: string | null;
  recipient_count: number;
  created_at: string;
};

export async function listEmailLog(limit = 300): Promise<EmailLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_log")
    .select(
      "id, queue_id, to_email, subject, category, status, provider_id, error, batch_id, recipient_count, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[email] listEmailLog:", error.message);
    return [];
  }

  return (data as unknown as LogDbRow[]).map((row) => ({
    id: row.id,
    queueId: row.queue_id,
    to: row.to_email,
    subject: row.subject,
    category: row.category,
    status: row.status,
    providerId: row.provider_id,
    error: row.error,
    batchId: row.batch_id,
    recipientCount: row.recipient_count,
    createdAt: row.created_at,
  }));
}
