import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminAiImportPanel from "@/components/admin/AdminAiImportPanel";
import AdminAiUsagePanel from "@/components/admin/AdminAiUsagePanel";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getAiUsage, isAiConfigured } from "@/lib/ai/client";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminAiPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const usage = await getAiUsage();

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.ai}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.aiTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{dict.admin.aiText}</p>
      </header>

      <AdminAiImportPanel dict={dict.admin} />
      <AdminAiUsagePanel
        configured={isAiConfigured()}
        usage={usage}
        dict={dict.admin}
      />
    </div>
  );
}
