"use server";

import { revalidatePath } from "next/cache";

import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getProAccess } from "@/lib/pro/queries";
import { isProPlan, PRO_ACCESS_MONTHS, type ProPlan } from "@/lib/pro/plans";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

export type ProActionResult = {
  ok: boolean;
  error?: "auth" | "pro" | "monthly" | "fields" | "failed" | "forbidden" | "not_found" | "role";
};

const AREAS = ["analytics", "export", "epk", "booking", "widget", "other"] as const;
const STATUSES = ["new", "reviewing", "planned", "released", "declined"] as const;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Il box richieste è riservato ai Pro attivi, una richiesta ogni 30 giorni.
 * La RLS ripete il controllo sull'accesso: l'azione non è l'unica difesa.
 */
export async function createProFeatureRequestAction(input: {
  area: string;
  title: string;
  problem: string;
  useCase: string;
}): Promise<ProActionResult> {
  const session = await getSessionProfile();
  if (!session) return { ok: false, error: "auth" };
  if (session.role !== "artist" && session.role !== "venue") {
    return { ok: false, error: "forbidden" };
  }

  const access = await getProAccess(session.id, session.role);
  if (!access?.active) return { ok: false, error: "pro" };

  const area = AREAS.includes(input.area as (typeof AREAS)[number]) ? input.area : "other";
  const title = clean(input.title, 120);
  const problem = clean(input.problem, 1200);
  const useCase = clean(input.useCase, 1200);

  if (title.length < 5 || problem.length < 10 || useCase.length < 10) {
    return { ok: false, error: "fields" };
  }

  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recent, error: recentError } = await supabase
    .from("pro_feature_requests")
    .select("id")
    .eq("profile_id", session.id)
    .gte("created_at", since)
    .limit(1);

  if (recentError) {
    console.error("[pro] monthly check:", recentError.message);
    return { ok: false, error: "failed" };
  }
  if (recent && recent.length > 0) return { ok: false, error: "monthly" };

  const { error } = await supabase.from("pro_feature_requests").insert({
    profile_id: session.id,
    area,
    title,
    problem,
    use_case: useCase,
  });

  if (error) {
    console.error("[pro] create request:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/dashboard/pro");
  revalidatePath("/admin/pro");
  return { ok: true };
}

/** Triage admin: solo stato, nessuna promessa di data. */
export async function updateProRequestStatusAction(input: {
  id: string;
  status: string;
}): Promise<ProActionResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "forbidden" };

  const id = input.id.trim();
  const status = STATUSES.includes(input.status as (typeof STATUSES)[number])
    ? input.status
    : "new";

  if (!id) return { ok: false, error: "fields" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pro_feature_requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("[pro] update request:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/pro");
  revalidatePath("/dashboard/pro");
  return { ok: true };
}

/**
 * Accesso manuale: serve finché non c'è PayPal. L'admin può concedere o
 * revocare; l'utente non può auto-assegnarsi nulla.
 */
export async function grantProAction(input: {
  email: string;
  plan: string;
  months?: number;
}): Promise<ProActionResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "forbidden" };

  const email = clean(input.email, 200).toLowerCase();
  const plan: ProPlan | null = isProPlan(input.plan) ? input.plan : null;
  const months = Math.min(24, Math.max(1, Math.round(input.months ?? PRO_ACCESS_MONTHS)));

  if (!email || !plan) return { ok: false, error: "fields" };

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    console.error("[pro] grant profile:", profileError.message);
    return { ok: false, error: "failed" };
  }
  if (!profile) return { ok: false, error: "not_found" };
  if (profile.role !== plan) return { ok: false, error: "role" };

  const now = new Date();
  const base = new Date(now);
  const { data: existing } = await supabase
    .from("pro_entitlements")
    .select("id, valid_until")
    .eq("profile_id", profile.id)
    .eq("plan", plan)
    .eq("status", "active")
    .order("valid_until", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && new Date(existing.valid_until) > now) {
    base.setTime(new Date(existing.valid_until).getTime());
  }
  const validUntil = new Date(base);
  validUntil.setMonth(validUntil.getMonth() + months);

  const payload = {
    profile_id: profile.id,
    plan,
    status: "active",
    starts_at: now.toISOString(),
    valid_until: validUntil.toISOString(),
    source: "manual" as const,
  };

  const { error } = existing
    ? await supabase.from("pro_entitlements").update(payload).eq("id", existing.id)
    : await supabase.from("pro_entitlements").insert(payload);

  if (error) {
    console.error("[pro] grant:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/pro");
  revalidatePath("/dashboard/pro");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Revoca manuale: non cancella la storia, marca l'accesso come revocato. */
export async function revokeProAction(input: { id: string }): Promise<ProActionResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "forbidden" };

  const id = input.id.trim();
  if (!id) return { ok: false, error: "fields" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pro_entitlements")
    .update({ status: "revoked" })
    .eq("id", id);

  if (error) {
    console.error("[pro] revoke:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/pro");
  revalidatePath("/dashboard/pro");
  revalidatePath("/dashboard");
  return { ok: true };
}
