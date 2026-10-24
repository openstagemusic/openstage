import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type NotificationType =
  | "event_cancelled"
  | "event_updated"
  | "event_reminder"
  | "follow_new_event"
  | "claim"
  | "moderation"
  | "system";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  priority: "critical" | "normal" | "low";
  metadata: Record<string, unknown>;
};

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
  priority: "critical" | "normal" | "low";
  metadata: Record<string, unknown> | null;
};

/** Quante notifiche non lette ha questo profilo. La RLS limita già le righe. */
export const getUnreadNotificationCount = cache(async (profileId: string): Promise<number> => {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profileId)
    .is("read_at", null)
    .gt("expires_at", new Date().toISOString());

  if (error) {
    console.error("[notifications] unread:", error.message);
    return 0;
  }

  return count ?? 0;
});

/** Le notifiche del profilo, dalla più recente. Filtro per tipo facoltativo. */
export const listNotifications = cache(
  async (profileId: string, type?: NotificationType | null): Promise<Notification[]> => {
    const supabase = await createClient();

    let query = supabase
      .from("notifications")
      .select("id, type, title, body, href, read_at, created_at, priority, metadata")
      .eq("user_id", profileId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (type) query = query.eq("type", type);

    const { data, error } = await query;

    if (error) {
      console.error("[notifications] list:", error.message);
      return [];
    }

    return (data as NotificationRow[]).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      href: row.href,
      readAt: row.read_at,
      createdAt: row.created_at,
      priority: row.priority,
      metadata: row.metadata ?? {},
    }));
  }
);
