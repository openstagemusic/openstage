import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminHelpForm from "@/components/admin/AdminHelpForm";
import LocaleLink from "@/components/i18n/LocaleLink";
import { getAdminHelpArticle, listHelpCategories } from "@/lib/help/queries";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function EditHelpArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isCurrentUserAdmin())) notFound();

  const { id } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.admin.help;

  const [article, categories] = await Promise.all([
    getAdminHelpArticle(id),
    listHelpCategories(locale),
  ]);

  if (!article) notFound();

  return (
    <div>
      <LocaleLink
        href="/admin/aiuto"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {t.back}
      </LocaleLink>

      <h1 className="mt-6 font-poster text-3xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-4xl">
        {t.edit}
      </h1>

      <AdminHelpForm dict={t} categories={categories} article={article} />
    </div>
  );
}
