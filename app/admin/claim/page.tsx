import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminClaimsPanel from "@/components/admin/AdminClaimsPanel";
import { isCurrentUserAdmin, listActiveClaims } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminClaimsPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const claims = await listActiveClaims();

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.people}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.claimsTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.claimsSubtitle}
        </p>
      </header>

      <AdminClaimsPanel claims={claims} dict={dict.admin} />
    </div>
  );
}
