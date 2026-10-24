import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PreferencesForm from "@/components/notifications/PreferencesForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getNotificationPreferences } from "@/lib/notifications/preferences";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NotificationSettingsPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  const dict = getDictionary(locale);
  const t = dict.notifications;
  const preferences = await getNotificationPreferences(session.id);

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{t.eyebrow}</p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {t.preferencesTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.preferencesText}</p>
      </header>

      <PreferencesForm preferences={preferences} dict={t} />
    </div>
  );
}
