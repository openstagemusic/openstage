import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminShell, { type AdminNavModule } from "@/components/admin/AdminShell";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { ADMIN_GROUP_ORDER, ADMIN_MODULES, adminGroupLabel } from "@/lib/admin/modules";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const session = await getSessionProfile();

  const modules: AdminNavModule[] = ADMIN_MODULES.map((module) => ({
    key: module.key,
    href: module.href,
    group: module.group,
    status: module.status,
    label: dict.admin.nav[module.labelKey],
  }));

  const groups = ADMIN_GROUP_ORDER.map((group) => ({
    key: group,
    label: adminGroupLabel(group, dict.admin.nav),
  }));

  return (
    <AdminShell
      modules={modules}
      groups={groups}
      dict={dict.admin}
      email={session?.email ?? null}
      logoutLabel={dict.nav.logout}
      closeMenuLabel={dict.nav.closeMenu}
    >
      {children}
    </AdminShell>
  );
}
