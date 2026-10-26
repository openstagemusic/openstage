import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminNotificationsPanel from "@/components/admin/AdminNotificationsPanel";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getNotificationStats, listRecentNotifications } from "@/lib/admin/notifications";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminNotificationsPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [stats, notifications] = await Promise.all([
    getNotificationStats(),
    listRecentNotifications(),
  ]);

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.communication}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.notifPanelTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.notifPanelSubtitle}
        </p>
      </header>

      {stats ? (
        <AdminNotificationsPanel
          stats={stats}
          notifications={notifications}
          dict={dict.admin}
        />
      ) : (
        <p className="mt-6 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
          {dict.admin.errorGeneric}
        </p>
      )}
    </div>
  );
}
