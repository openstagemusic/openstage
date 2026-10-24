import { createAdminClient } from "@/lib/supabase/admin";

export type EmailCategory = "auth" | "transactional" | "digest" | "optional";

export type EnqueueEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  from?: string;
  category: EmailCategory;
  /** Stessa chiave = stessa email: il database non crea doppioni. */
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

/**
 * Mette un'email in coda.
 *
 * La coda è per le email non critiche e per i futuri digest. Auth e risposte
 * 1:1 continuano a usare `sendEmail` direttamente: non devono aspettare il
 * worker né essere bloccate dalla quota.
 */
export async function enqueueEmail(input: EnqueueEmailInput): Promise<{ ok: boolean; id?: string }> {
  const from = input.from?.trim() || process.env.EMAIL_FROM?.trim() || "OpenStage <noreply@getopenstage.it>";

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("email_queue")
      .upsert(
        {
          to_email: input.to,
          from_email: from,
          reply_to: input.replyTo ?? null,
          subject: input.subject,
          text_body: input.text,
          html_body: input.html ?? null,
          category: input.category,
          idempotency_key: input.idempotencyKey,
          metadata: input.metadata ?? {},
        },
        { onConflict: "idempotency_key", ignoreDuplicates: true }
      )
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[email-queue] enqueue:", error.message);
      return { ok: false };
    }

    return { ok: true, id: data?.id };
  } catch (error) {
    console.error("[email-queue] enqueue:", error instanceof Error ? error.message : error);
    return { ok: false };
  }
}
