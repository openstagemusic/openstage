import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminReportsPanel from "@/components/admin/AdminReportsPanel";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { listAdminReports } from "@/lib/admin/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminReportsPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const reports = await listAdminReports();

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.content}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.reportsTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.reportsSubtitle}
        </p>
      </header>

      <AdminReportsPanel reports={reports} dict={dict.admin} />
    </div>
  );
}
