"use server";

import { revalidatePath } from "next/cache";

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
