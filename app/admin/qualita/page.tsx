import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminQualityPanel from "@/components/admin/AdminQualityPanel";
import { getDataQualityReport } from "@/lib/admin/quality";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * La coda della qualità dati.
 *
 * Non è un cruscotto di vanità: è l'elenco di ciò che va sistemato. I controlli
 * sono automatici e deterministici, la correzione resta in mano all'admin.
 */
export default async function AdminQualityPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const report = await getDataQualityReport();

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.content}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.qualityTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.qualityText}
        </p>
      </header>

      <AdminQualityPanel report={report} dict={dict.admin} locale={locale} />
    </div>
  );
}
