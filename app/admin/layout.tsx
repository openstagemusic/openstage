import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import AdminShell, { type AdminNavModule } from "@/components/admin/AdminShell";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { ADMIN_GROUP_ORDER, ADMIN_MODULES, adminGroupLabel } from "@/lib/admin/modules";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getCurrentPath, getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const path = await getCurrentPath();
  const session = await getSessionProfile();

  // 2FA obbligatoria, con una sola eccezione: una sospensione temporanea
  // decisa dall'admin. La chiave TOTP resta salvata, quindi alla scadenza si
  // torna a chiedere il codice senza riconfigurare nulla.
  const bypassUntil = session?.mfaBypassUntil ? new Date(session.mfaBypassUntil) : null;
  const bypassActive = bypassUntil !== null && bypassUntil.getTime() > Date.now();

  if (path !== "/admin/sicurezza" && !bypassActive) {
    const supabase = await createClient();
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (assurance?.currentLevel !== "aal2") {
      redirect(withLocale(locale, "/admin/sicurezza"));
    }
  }

  const bypassLabel = bypassActive
    ? new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(bypassUntil)
    : null;

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
      mfaBypassLabel={bypassLabel}
    >
      {children}
    </AdminShell>
  );
}
