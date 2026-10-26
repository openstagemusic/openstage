import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminEmailPanel from "@/components/admin/AdminEmailPanel";
import { getEmailStats, listEmailLog, listEmailQueue } from "@/lib/admin/email";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminEmailPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [stats, queue, log] = await Promise.all([
    getEmailStats(),
    listEmailQueue(),
    listEmailLog(),
  ]);

  const limits = {
    daily: Math.max(1, Number(process.env.EMAIL_DAILY_LIMIT ?? "100") || 100),
    monthly: Math.max(1, Number(process.env.EMAIL_MONTHLY_LIMIT ?? "3000") || 3000),
    reservePercent: Math.min(
      80,
      Math.max(0, Number(process.env.EMAIL_RESERVE_PERCENT ?? "20") || 20)
    ),
  };

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.communication}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.emailPanelTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.emailPanelSubtitle}
        </p>
      </header>

      {stats ? (
        <AdminEmailPanel
          stats={stats}
          queue={queue}
          log={log}
          limits={limits}
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
