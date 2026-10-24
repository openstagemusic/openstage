import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

type ResendEvent = {
  type?: string;
  data?: { email_id?: string };
};

function verifySvix(raw: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${raw}`)
    .digest("base64");

  return signature
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter(Boolean)
    .some((candidate) => {
      const a = Buffer.from(candidate);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    });
}

/** Webhook Resend: consegnate, rimbalzate, spam. Non salva corpi email. */
export async function POST(request: NextRequest) {
  if (!process.env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });
  }

  const raw = await request.text();

  if (!verifySvix(raw, request.headers)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(raw) as ResendEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const emailId = event.data?.email_id;
  const status =
    event.type === "email.delivered"
      ? "delivered"
      : event.type === "email.bounced"
        ? "bounced"
        : event.type === "email.complained"
          ? "complained"
          : event.type === "email.failed"
            ? "failed"
            : null;

  if (emailId && status) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("email_log")
      .update({ status })
      .eq("provider_id", emailId);

    if (error) console.error("[email-webhook] update:", error.message);
  }

  return NextResponse.json({ ok: true });
}
