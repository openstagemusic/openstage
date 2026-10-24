"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "@/lib/i18n/server";
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

/** Preferenze notifiche: in-app, digest opt-in e avvisi urgenti. */
export async function updateNotificationPreferencesAction(
  formData: FormData
): Promise<{ ok: boolean }> {
  const session = await getSessionProfile();
  if (!session) return { ok: false };

  const locale = await getLocale();
  const supabase = await createClient();

  const patch = {
    user_id: session.id,
    in_app_event_cancelled: formData.get("in_app_event_cancelled") === "on",
    in_app_event_updated: formData.get("in_app_event_updated") === "on",
    in_app_follows: formData.get("in_app_follows") === "on",
    email_digest: formData.get("email_digest") === "on",
    email_urgent: formData.get("email_urgent") === "on",
    locale,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(patch, { onConflict: "user_id" });

  if (error) {
    console.error("[notifications] update preferences:", error.message);
    return { ok: false };
  }

  revalidatePath("/dashboard/impostazioni");
  revalidatePath("/dashboard/notifiche");
  revalidatePath("/", "layout");

  return { ok: true };
}
