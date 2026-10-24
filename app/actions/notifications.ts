"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

function refresh() {
  revalidatePath("/dashboard/notifiche");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

/** Segna una notifica come letta. La RLS impedisce di toccare quelle altrui. */
export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const session = await getSessionProfile();
  if (!session) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", session.id)
    .is("read_at", null);

  if (error) {
    console.error("[notifications] mark read:", error.message);
    return;
  }

  refresh();
}

/** “Segna tutte come lette”: una sola query, nessuna email. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await getSessionProfile();
  if (!session) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.id)
    .is("read_at", null);

  if (error) {
    console.error("[notifications] mark all read:", error.message);
    return;
  }

  refresh();
}
