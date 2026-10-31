import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminHelpForm from "@/components/admin/AdminHelpForm";
import LocaleLink from "@/components/i18n/LocaleLink";
import { listHelpCategories } from "@/lib/help/queries";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewHelpArticlePage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.admin.help;
  const categories = await listHelpCategories(locale);

  return (
    <div>
      <LocaleLink
        href="/admin/aiuto"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {t.back}
      </LocaleLink>

      <h1 className="mt-6 font-poster text-3xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-4xl">
        {t.new}
      </h1>

      <AdminHelpForm
        dict={t}
        categories={categories}
        article={{
          slug: "",
          categoryId: categories[0]?.id ?? null,
          titleIt: "",
          titleEn: "",
          bodyIt: "",
          bodyEn: "",
          status: "draft",
          position: 0,
        }}
      />
    </div>
  );
}
