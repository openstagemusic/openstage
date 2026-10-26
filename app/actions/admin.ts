"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { sendTelegramMessage } from "@/lib/telegram";
import { createClient } from "@/lib/supabase/server";

/**
 * Azioni della control room su persone e segnalazioni.
 *
 * Come per i claim, la sicurezza sta nel database: qui si chiamano solo le
 * funzioni `admin_*`, che ricontrollano il ruolo e scrivono l'audit.
 */

export type AdminActionResult = { ok: boolean; error?: string };

function result(error: { message: string } | null): AdminActionResult {
  if (!error) return { ok: true };
  console.error("[admin]", error.message);
  return { ok: false, error: error.message };
}

export async function setUserSuspendedAction(input: {
  profileId: string;
  suspended: boolean;
  note?: string | null;
}): Promise<AdminActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_suspended", {
    p_profile_id: input.profileId,
    p_suspended: input.suspended,
    p_note: input.note ?? null,
  });

  if (!error) {
    revalidatePath("/admin/utenti");
    revalidatePath("/admin");
  }

  return result(error);
}

export async function resolveReportAction(input: {
  reportId: string;
  status: "open" | "resolved" | "dismissed";
  note?: string | null;
}): Promise<AdminActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_report", {
    p_report_id: input.reportId,
    p_status: input.status,
    p_note: input.note ?? null,
  });

  if (!error) {
    revalidatePath("/admin/segnalazioni");
    revalidatePath("/admin");
  }

  return result(error);
}

/** Sospende la 2FA per una finestra breve, senza cancellare il fattore TOTP. */
export async function setMfaBypassAction(input: {
  minutes: number;
}): Promise<AdminActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_mfa_bypass", {
    p_minutes: input.minutes,
    p_reason: null,
  });

  if (!error) {
    revalidatePath("/admin", "layout");
  }

  return result(error);
}

/** Chiude subito la finestra di bypass. */
export async function clearMfaBypassAction(): Promise<AdminActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_clear_mfa_bypass");

  if (!error) {
    revalidatePath("/admin", "layout");
  }

  return result(error);
}

export type ClaimInviteActionResult = {
  ok: boolean;
  accountExists?: boolean;
  error?: string;
};

/** Crea un invito a reclamare una scheda. L'email/notifica parte dal database. */
export async function createClaimInviteAction(input: {
  subjectType: "artist" | "venue";
  subjectId: string;
  email: string;
}): Promise<ClaimInviteActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_claim_invite", {
    p_subject_type: input.subjectType,
    p_subject_id: input.subjectId,
    p_email: input.email,
  });

  if (error || !data) {
    console.error("[admin] createClaimInvite:", error?.message);
    return { ok: false, error: error?.message };
  }

  revalidatePath("/admin/claim");

  const result = data as unknown as { accountExists?: boolean };
  return { ok: true, accountExists: result.accountExists === true };
}

/** Revoca un invito ancora in attesa. */
export async function revokeClaimInviteAction(input: {
  inviteId: string;
}): Promise<AdminActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_claim_invite", {
    p_invite_id: input.inviteId,
  });

  if (!error) {
    revalidatePath("/admin/claim");
  }

  return result(error);
}

export type TelegramTestResult = {
  ok: boolean;
  error?: "unauthorized" | "not_configured" | "failed";
};

/** Invia il messaggio di prova dal server Vercel (non passa dal browser). */
export async function sendTelegramTestAction(): Promise<TelegramTestResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const result = await sendTelegramMessage(
    "✅ OpenStage: notifiche Telegram attive." +
      "\nDa ora ricevi qui gli avvisi delle code admin." +
      "\nhttps://getopenstage.it/it/admin"
  );

  return result;
}

/** Invia il messaggio di prova dal server Vercel (secondo bot). */
export async function sendTelegramActivityTestAction(): Promise<TelegramTestResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const result = await sendTelegramMessage(
    "✅ OpenStage Activity: notifiche attive." +
      "\nDa ora ricevi qui nuove registrazioni e nuovi eventi." +
      "\nhttps://getopenstage.it/it/admin",
    "activity"
  );

  return result;
}

export type EmailRetryResult = {
  ok: boolean;
  count?: number;
  categories?: Record<string, number>;
  dryRun?: boolean;
  error?: "unauthorized" | "failed";
};

/** Anteprima o retry reale delle email fallite, a lotti. */
export async function retryFailedEmailsAction(input: {
  ids?: string[];
  dryRun: boolean;
}): Promise<EmailRetryResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_retry_email_queue", {
    p_ids: input.ids && input.ids.length > 0 ? input.ids : null,
    p_dry_run: input.dryRun,
  });

  if (error || !data) {
    console.error("[admin] retryFailedEmails:", error?.message);
    return { ok: false, error: "failed" };
  }

  const result = data as unknown as {
    count?: number;
    categories?: Record<string, number>;
    dryRun?: boolean;
  };

  if (!input.dryRun) {
    revalidatePath("/admin/email");
    revalidatePath("/admin");
  }

  return {
    ok: true,
    count: result.count ?? 0,
    categories: result.categories ?? {},
    dryRun: result.dryRun === true,
  };
}

export type NotificationPreviewResult = {
  ok: boolean;
  count: number;
  label?: string;
  error?: "unauthorized" | "not_found" | "failed";
};

/** Anteprima del target: nessuna scrittura. */
export async function previewNotificationTargetAction(input: {
  mode: "user" | "role";
  value: string;
}): Promise<NotificationPreviewResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, count: 0, error: "unauthorized" };

  const { resolveNotificationTarget } = await import("@/lib/admin/notifications");
  const target = await resolveNotificationTarget(input);

  if (!target.ok) {
    return { ok: false, count: 0, error: target.error ?? "failed" };
  }

  return {
    ok: true,
    count: target.count,
    label: input.mode === "user" ? target.email : input.value,
  };
}

export type NotificationSendResult = {
  ok: boolean;
  count?: number;
  error?: "unauthorized" | "invalid" | "failed";
};

/** Invia una notifica in-app a un utente o a un ruolo, con audit. */
export async function sendManualNotificationAction(input: {
  mode: "user" | "role";
  value: string;
  title: string;
  body: string;
  href?: string | null;
}): Promise<NotificationSendResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "unauthorized" };

  const title = input.title.trim();
  const body = input.body.trim();
  const href = input.href?.trim() || null;

  if (title.length < 3 || title.length > 120 || body.length < 5 || body.length > 1000) {
    return { ok: false, error: "invalid" };
  }

  if (href && !href.startsWith("/")) return { ok: false, error: "invalid" };

  const { resolveNotificationTarget } = await import("@/lib/admin/notifications");
  const target = await resolveNotificationTarget(input);

  if (!target.ok || target.count === 0) {
    return { ok: false, error: target.error === "failed" ? "failed" : "invalid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_send_manual_notification", {
    p_user_id: input.mode === "user" ? target.userId ?? null : null,
    p_role: input.mode === "role" ? input.value : null,
    p_title: title,
    p_body: body,
    p_href: href,
  });

  if (error || data === null) {
    console.error("[admin] sendManualNotification:", error?.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/notifiche");
  revalidatePath("/admin");

  return { ok: true, count: Number(data) };
}
