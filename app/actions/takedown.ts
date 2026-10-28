"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  sendTakedownAcknowledgement,
  sendTakedownNotification,
  sendTakedownOutcome,
} from "@/lib/email";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import type { TakedownNoticeStatus, TakedownNoticeType } from "@/lib/admin/takedown";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

const TYPES = new Set<TakedownNoticeType>([
  "copyright",
  "trademark",
  "privacy",
  "defamation",
  "illegal",
  "other",
]);

const STATUSES = new Set<TakedownNoticeStatus>(["new", "reviewing", "actioned", "rejected"]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function httpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Il modulo pubblico della notice & takedown.
 *
 * Scrive in `takedown_notices` con la sessione anonima: la RLS accetta solo
 * stato `new` e dichiarazioni vere. Email e notifica in-app sono un di più: se
 * Resend non risponde, la notice resta comunque nella coda admin.
 */
export async function submitTakedownNotice(formData: FormData): Promise<never> {
  const locale = await getLocale();

  const fail = (code: string): never => {
    redirect(withLocale(locale, `/notice-takedown?errore=${code}`));
  };

  // Honeypot: fingiamo successo per non dare indizi ai bot.
  if (text(formData, "website")) {
    redirect(withLocale(locale, "/notice-takedown?stato=inviato"));
  }

  const type = text(formData, "type") as TakedownNoticeType;
  const name = text(formData, "name");
  const email = text(formData, "email");
  const organization = text(formData, "organization");
  const targetUrl = httpUrl(text(formData, "target_url"));
  const description = text(formData, "description");
  const evidenceInput = text(formData, "evidence_url");
  const evidenceUrl = evidenceInput ? httpUrl(evidenceInput) : null;
  const goodFaith = text(formData, "good_faith") === "on";
  const accuracy = text(formData, "accuracy") === "on";

  if (
    !TYPES.has(type) ||
    name.length < 2 ||
    name.length > 120 ||
    email.length > 200 ||
    !EMAIL_PATTERN.test(email) ||
    organization.length > 160 ||
    !targetUrl ||
    description.length < 20 ||
    description.length > 4000 ||
    (evidenceInput !== "" && !evidenceUrl) ||
    !goodFaith ||
    !accuracy
  ) {
    return fail("campi");
  }

  const supabase = await createClient();
  const noticeId = crypto.randomUUID();
  const { error } = await supabase
    .from("takedown_notices")
    .insert({
      id: noticeId,
      notice_type: type,
      reporter_name: name,
      reporter_email: email,
      organization: organization || null,
      target_url: targetUrl,
      description,
      evidence_url: evidenceUrl,
      good_faith: goodFaith,
      accuracy,
      locale,
    });

  if (error) {
    console.error("[takedown] insert:", error.message);
    return fail("invio");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/takedown");

  // Le email non devono far fallire la segnalazione.
  await Promise.allSettled([
    sendTakedownNotification({
      noticeId,
      type,
      reporterName: name,
      reporterEmail: email,
      organization: organization || null,
      targetUrl,
      description,
      locale,
    }),
    sendTakedownAcknowledgement({ to: email, name, noticeId, locale }),
  ]);

  redirect(withLocale(locale, "/notice-takedown?stato=inviato"));
}

export type TakedownUpdateResult = { ok: boolean; error?: "unauthorized" | "invalid" | "failed" };

/** Decisione dell'admin: stato, nota interna e azione eseguita, con audit. */
export async function updateTakedownNoticeAction(input: {
  id: string;
  status: TakedownNoticeStatus;
  note?: string | null;
  action?: string | null;
}): Promise<TakedownUpdateResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };
  if (!STATUSES.has(input.status)) return { ok: false, error: "invalid" };

  const note = input.note?.trim() || null;
  const action = input.action?.trim() || null;

  if ((note?.length ?? 0) > 2000 || (action?.length ?? 0) > 1000) {
    return { ok: false, error: "invalid" };
  }

  if (input.status === "actioned" && !action) return { ok: false, error: "invalid" };
  if (input.status === "rejected" && !note) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_takedown", {
    p_id: input.id,
    p_status: input.status,
    p_note: note,
    p_action: action,
  });

  if (error) {
    console.error("[takedown] update:", error.message);
    return { ok: false, error: "failed" };
  }

  if (input.status === "actioned" || input.status === "rejected") {
    const { data: notice } = await supabase
      .from("takedown_notices")
      .select("reporter_name, reporter_email, locale, action_taken, status")
      .eq("id", input.id)
      .maybeSingle();

    if (notice?.reporter_email) {
      await sendTakedownOutcome({
        to: notice.reporter_email,
        name: notice.reporter_name,
        noticeId: input.id,
        status: input.status,
        action: notice.action_taken,
        locale: notice.locale,
      });
    }
  }

  revalidatePath("/admin/takedown");
  revalidatePath("/admin");

  return { ok: true };
}
