import { cache } from "react";

import type { ProPlan } from "./plans";
import { createClient } from "@/lib/supabase/server";

export type ProAccessStatus = "active" | "expired" | "refunded" | "revoked";

export type ProAccess = {
  id: string;
  plan: ProPlan;
  status: ProAccessStatus;
  startsAt: string;
  validUntil: string;
  source: "manual" | "paypal";
  /** Calcolato da status + data: il database non ha un booleano `is_pro`. */
  active: boolean;
};

type EntitlementRow = {
  id: string;
  plan: string;
  status: string;
  starts_at: string;
  valid_until: string;
  source: string;
};

export type ProRequest = {
  id: string;
  area: string;
  title: string;
  problem: string;
  useCase: string;
  status: "new" | "reviewing" | "planned" | "released" | "declined";
  createdAt: string;
};

type RequestRow = {
  id: string;
  area: string;
  title: string;
  problem: string;
  use_case: string;
  status: string;
  created_at: string;
};

export type AdminProRequest = ProRequest & {
  profileId: string;
  email: string | null;
  name: string | null;
};

export type AdminProEntitlement = {
  id: string;
  profileId: string;
  email: string | null;
  name: string | null;
  plan: ProPlan;
  status: ProAccessStatus;
  validUntil: string;
  source: "manual" | "paypal";
  active: boolean;
};

function toStatus(value: string): ProAccessStatus {
  return value === "expired" || value === "refunded" || value === "revoked"
    ? value
    : "active";
}

function toRequestStatus(value: string): ProRequest["status"] {
  return value === "reviewing" || value === "planned" || value === "released" || value === "declined"
    ? value
    : "new";
}

/** L'accesso Pro del profilo, se esiste. `active` dipende anche dalla data. */
export const getProAccess = cache(
  async (profileId: string, plan: ProPlan): Promise<ProAccess | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pro_entitlements")
      .select("id, plan, status, starts_at, valid_until, source")
      .eq("profile_id", profileId)
      .eq("plan", plan)
      .order("valid_until", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[pro] getProAccess:", error.message);
      return null;
    }
    if (!data) return null;

    const row = data as EntitlementRow;
    const status = toStatus(row.status);
    const active = status === "active" && new Date(row.valid_until).getTime() > Date.now();

    return {
      id: row.id,
      plan: row.plan as ProPlan,
      status,
      startsAt: row.starts_at,
      validUntil: row.valid_until,
      source: row.source === "paypal" ? "paypal" : "manual",
      active,
    };
  }
);

/** Le ultime richieste del profilo, per mostrare lo stato nella dashboard. */
export async function listMyProRequests(profileId: string): Promise<ProRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pro_feature_requests")
    .select("id, area, title, problem, use_case, status, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("[pro] listMyProRequests:", error.message);
    return [];
  }

  return ((data as RequestRow[] | null) ?? []).map((row) => ({
    id: row.id,
    area: row.area,
    title: row.title,
    problem: row.problem,
    useCase: row.use_case,
    status: toRequestStatus(row.status),
    createdAt: row.created_at,
  }));
}

/** Coda admin delle richieste. */
export async function listAdminProRequests(): Promise<AdminProRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pro_feature_requests")
    .select(
      "id, profile_id, area, title, problem, use_case, status, created_at, profiles ( email, full_name )"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[pro] listAdminProRequests:", error.message);
    return [];
  }

  return ((data as unknown as Array<RequestRow & {
    profile_id: string;
    profiles: { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null;
  }> | null) ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    return {
      id: row.id,
      profileId: row.profile_id,
      email: profile?.email ?? null,
      name: profile?.full_name ?? null,
      area: row.area,
      title: row.title,
      problem: row.problem,
      useCase: row.use_case,
      status: toRequestStatus(row.status),
      createdAt: row.created_at,
    };
  });
}

/** Accessi Pro per la control room. */
export async function listProEntitlements(): Promise<AdminProEntitlement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pro_entitlements")
    .select(
      "id, profile_id, plan, status, valid_until, source, profiles ( email, full_name )"
    )
    .order("valid_until", { ascending: false });

  if (error) {
    console.error("[pro] listProEntitlements:", error.message);
    return [];
  }

  return ((data as unknown as Array<{
    id: string;
    profile_id: string;
    plan: string;
    status: string;
    valid_until: string;
    source: string;
    profiles: { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null;
  }> | null) ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const status = toStatus(row.status);

    return {
      id: row.id,
      profileId: row.profile_id,
      email: profile?.email ?? null,
      name: profile?.full_name ?? null,
      plan: row.plan as ProPlan,
      status,
      validUntil: row.valid_until,
      source: row.source === "paypal" ? "paypal" : "manual",
      active: status === "active" && new Date(row.valid_until).getTime() > Date.now(),
    };
  });
}
