import type { Metadata } from "next";
import { redirect } from "next/navigation";

import DeleteAccountForm from "@/components/account/DeleteAccountForm";
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

      <section className="mt-12 border-t border-line pt-6">
        <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
          {dict.accountDanger.dataTitle}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          {dict.accountDanger.dataText}
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/dashboard/impostazioni/esporta"
          className="mt-4 inline-flex min-h-11 items-center gap-2 border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
        >
          {dict.accountDanger.exportCta} <span aria-hidden="true">↓</span>
        </a>
      </section>

      <section className="mt-12 border-t border-pink/30 pt-6">
        <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em] text-pink">
          {dict.accountDanger.deleteTitle}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          {dict.accountDanger.deleteText}
        </p>
        <DeleteAccountForm dict={dict.accountDanger} />
      </section>
    </div>
  );
}
