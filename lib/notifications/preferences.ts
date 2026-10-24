import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type NotificationPreferences = {
  inAppEventCancelled: boolean;
  inAppEventUpdated: boolean;
  inAppFollows: boolean;
  emailDigest: boolean;
  emailUrgent: boolean;
  locale: "it" | "en";
};

const DEFAULTS: NotificationPreferences = {
  inAppEventCancelled: true,
  inAppEventUpdated: true,
  inAppFollows: true,
  emailDigest: false,
  emailUrgent: false,
  locale: "it",
};

type PreferenceRow = {
  in_app_event_cancelled: boolean;
  in_app_event_updated: boolean;
  in_app_follows: boolean;
  email_digest: boolean;
  email_urgent: boolean;
  locale: "it" | "en";
};

export const getNotificationPreferences = cache(
  async (profileId: string): Promise<NotificationPreferences> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("notification_preferences")
      .select(
        "in_app_event_cancelled, in_app_event_updated, in_app_follows, email_digest, email_urgent, locale"
      )
      .eq("user_id", profileId)
      .maybeSingle();

    if (error) {
      console.error("[notifications] preferences:", error.message);
      return DEFAULTS;
    }

    if (!data) return DEFAULTS;

    const row = data as PreferenceRow;
    return {
      inAppEventCancelled: row.in_app_event_cancelled,
      inAppEventUpdated: row.in_app_event_updated,
      inAppFollows: row.in_app_follows,
      emailDigest: row.email_digest,
      emailUrgent: row.email_urgent,
      locale: row.locale,
    };
  }
);
