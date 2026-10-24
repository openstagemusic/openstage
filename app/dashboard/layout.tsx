import type { Metadata } from "next";
import { redirect } from "next/navigation";

import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { canManageEvents } from "@/lib/auth/roles";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

/** L'area personale non finisce nei motori di ricerca e non si mostra da scollegati. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  const dict = getDictionary(locale);
  const t = dict.dashboard;

  const items: DashboardNavItem[] = [
    { href: "/dashboard", label: t.title },
    ...(canManageEvents(session.role)
      ? [
          { href: "/dashboard/events", label: t.navEvents },
          { href: "/dashboard/events/new", label: t.navNew },
        ]
      : []),
    { href: "/dashboard/saved", label: t.navSaved },
    { href: "/dashboard/notifiche", label: t.navNotifications },
    { href: "/dashboard/impostazioni", label: t.navSettings },
    { href: "/account", label: t.navProfile },
  ];

  // La coda di moderazione compare solo a chi la può davvero usare (`is_admin()`
  // è la stessa funzione che autorizza le azioni, non una variabile d'ambiente).
  if (await isCurrentUserAdmin()) {
    items.push({ href: "/admin", label: t.navAdmin });
  }

  return (
    <DashboardShell items={items} dict={t}>
      {children}
    </DashboardShell>
  );
}
