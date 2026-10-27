import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminAiUsagePanel from "@/components/admin/AdminAiUsagePanel";
import AdminEventCreatePanel from "@/components/admin/AdminEventCreatePanel";
import Link from "@/components/i18n/LocaleLink";
import { getAiUsage, isAiConfigured } from "@/lib/ai/client";
import { listOwnerOptions } from "@/lib/admin/queries";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminNewEventPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const [owners, usage] = await Promise.all([listOwnerOptions(), getAiUsage()]);

  return (
    <div>
      <Link
        href="/admin/eventi"
        className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-cyan"
      >
        ← {dict.admin.aiCreateBack}
      </Link>

      <header className="mt-4 border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.content}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.aiCreateTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.aiCreateText}
        </p>
      </header>

      <AdminEventCreatePanel owners={owners} dict={dict.admin} />

      <AdminAiUsagePanel
        configured={isAiConfigured()}
        usage={usage}
        dict={dict.admin}
      />
    </div>
  );
}
