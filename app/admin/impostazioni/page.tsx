import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminAiUsagePanel from "@/components/admin/AdminAiUsagePanel";
import AdminTelegramPanel from "@/components/admin/AdminTelegramPanel";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { isTelegramConfigured } from "@/lib/telegram";
import { getAiUsage, isAiConfigured } from "@/lib/ai/client";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const [aiUsage] = await Promise.all([getAiUsage()]);

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.system}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.settingsTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.settingsSubtitle}
        </p>
      </header>

      <AdminTelegramPanel configured={isTelegramConfigured()} dict={dict.admin} />
      <AdminTelegramPanel
        configured={isTelegramConfigured("activity")}
        dict={dict.admin}
        kind="activity"
      />
      <AdminAiUsagePanel
        configured={isAiConfigured()}
        usage={aiUsage}
        dict={dict.admin}
      />
    </div>
  );
}
