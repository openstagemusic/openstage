import { NextResponse, type NextRequest } from "next/server";

import { sendEmailDetailed } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

type QueueRow = {
  id: string;
  to_email: string;
  from_email: string;
  reply_to: string | null;
  subject: string;
  text_body: string;
  html_body: string | null;
  category: "auth" | "transactional" | "digest" | "optional";
  attempts: number;
  max_attempts: number;
};

function authorized(request: NextRequest): boolean {
  const secret = process.env.EMAIL_WORKER_SECRET;
  if (!secret) return false;

  const header = request.headers.get("x-email-worker-secret");
  const query = request.nextUrl.searchParams.get("secret");
  return header === secret || query === secret;
}

async function runWorker(): Promise<NextResponse> {
  const supabase = createAdminClient();

  // Tetto giornaliero prudente. Le email di auth non passano da questa coda.
  const dailyLimit = Math.max(1, Number(process.env.EMAIL_DAILY_LIMIT ?? "100") || 100);
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfDay.toISOString())
    .in("status", ["sent", "delivered"]);

  if ((count ?? 0) >= dailyLimit) {
    return NextResponse.json(
      { ok: false, error: "daily_limit_reached", sentToday: count ?? 0 },
      { status: 429 }
    );
  }

  const { data, error } = await supabase.rpc("claim_email_batch", { p_limit: 10 });

  if (error) {
    console.error("[email-worker] claim:", error.message);
    return NextResponse.json({ ok: false, error: "claim_failed" }, { status: 500 });
  }

  const batch = (data ?? []) as QueueRow[];
  let sent = 0;
  let failed = 0;

  for (const item of batch) {
    const result = await sendEmailDetailed({
      to: item.to_email,
      from: item.from_email,
      replyTo: item.reply_to ?? undefined,
      subject: item.subject,
      text: item.text_body,
      html: item.html_body ?? undefined,
    });

    if (result.ok) {
      sent += 1;
      await supabase
        .from("email_queue")
        .update({
          status: "sent",
          provider_id: result.id ?? null,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", item.id);

      await supabase.from("email_log").insert({
        queue_id: item.id,
        category: item.category,
        to_email: item.to_email,
        subject: item.subject,
        status: "sent",
        provider_id: result.id ?? null,
      });
    } else {
      failed += 1;
      const final = item.attempts >= item.max_attempts;
      const retryAt = new Date(Date.now() + item.attempts * 60_000).toISOString();

      await supabase
        .from("email_queue")
        .update({
          status: final ? "failed" : "pending",
          next_attempt_at: final ? new Date().toISOString() : retryAt,
          updated_at: new Date().toISOString(),
          last_error: result.error?.slice(0, 500) ?? "unknown",
        })
        .eq("id", item.id);

      await supabase.from("email_log").insert({
        queue_id: item.id,
        category: item.category,
        to_email: item.to_email,
        subject: item.subject,
        status: "failed",
        error: result.error?.slice(0, 500) ?? "unknown",
      });
    }

    // Tetto prudente: massimo 2 invii al secondo.
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return NextResponse.json({
    ok: true,
    processed: batch.length,
    sent,
    failed,
    sentToday: (count ?? 0) + sent,
  });
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return runWorker();
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return runWorker();
}
