import { createClient } from "@/lib/supabase/server";

/** Notifiche in-app viste dall'admin: solo aggregati reali e nessun dato di vanità. */

export type NotificationStats = {
  total: number;
  unread: number;
  read: number;
  lastWeek: number;
  byType: Record<string, number>;
};

export async function getNotificationStats(): Promise<NotificationStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_notification_stats");

  if (error || !data) {
    console.error("[admin] admin_notification_stats:", error?.message);
    return null;
  }

  return data as unknown as NotificationStats;
}

export type AdminNotification = {
  id: string;
  userEmail: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  priority: "critical" | "normal" | "low";
  readAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  priority: "critical" | "normal" | "low";
  read_at: string | null;
  created_at: string;
  user: { email: string | null } | null;
};

export async function listRecentNotifications(limit = 150): Promise<AdminNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, title, body, href, priority, read_at, created_at, user:profiles!notifications_user_id_fkey ( email )"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin] listRecentNotifications:", error.message);
    return [];
  }

  return (data as unknown as NotificationRow[]).map((row) => ({
    id: row.id,
    userEmail: row.user?.email ?? null,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    priority: row.priority,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export type NotificationTargetMode = "user" | "role";

export type NotificationTarget = {
  ok: boolean;
  count: number;
  userId?: string;
  email?: string;
  error?: "not_found" | "failed";
};

/** Risolve il target senza scrivere nulla: serve al dry run. */
export async function resolveNotificationTarget(input: {
  mode: NotificationTargetMode;
  value: string;
}): Promise<NotificationTarget> {
  const supabase = await createClient();
  const value = input.value.trim();

  if (input.mode === "user") {
    if (!value) return { ok: false, count: 0, error: "not_found" };

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", value)
      .maybeSingle();

    if (error) {
      console.error("[admin] resolveNotificationTarget:", error.message);
      return { ok: false, count: 0, error: "failed" };
    }

    if (!data) return { ok: false, count: 0, error: "not_found" };

    return {
      ok: true,
      count: 1,
      userId: data.id,
      email: data.email ?? value,
    };
  }

  if (!["fan", "artist", "venue", "admin"].includes(value)) {
    return { ok: false, count: 0, error: "not_found" };
  }

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", value);

  if (error) {
    console.error("[admin] resolveNotificationTarget role:", error.message);
    return { ok: false, count: 0, error: "failed" };
  }

  return { ok: true, count: count ?? 0 };
}
