import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LocaleLink from "@/components/i18n/LocaleLink";
import { listAdminHelpArticles, listHelpCategories } from "@/lib/help/queries";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Help Center, lato redazione.
 *
 * Elenco completo (anche bozze) con stato e categoria. Le guide si scrivono in
 * Markdown, in italiano e inglese, e si pubblicano da qui.
 */
export default async function AdminHelpPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.admin.help;

  const [articles, categories] = await Promise.all([
    listAdminHelpArticles(locale),
    listHelpCategories(locale),
  ]);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
            {dict.admin.nav.community}
          </p>
          <h1 className="mt-2 font-poster text-3xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{t.text}</p>
        </div>

        <LocaleLink
          href="/admin/aiuto/nuovo"
          className="inline-flex min-h-11 items-center gap-2 bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
        >
          {t.new}
        </LocaleLink>
      </header>

      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
        {articles.length} {articles.length === 1 ? dict.help.articlesOne : dict.help.articlesMany} ·{" "}
        {categories.length} {dict.help.categoriesTitle.toLowerCase()}
      </p>

      {articles.length === 0 ? (
        <p className="mt-6 os-note">{t.empty}</p>
      ) : (
        <ul className="mt-4 border-t border-line">
          {articles.map((article) => (
            <li key={article.id} className="border-b border-line">
              <div className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">
                    {article.categoryName ?? "—"} ·{" "}
                    <span className={article.status === "published" ? "text-cyan" : "text-muted"}>
                      {article.status === "published" ? t.published : t.draft}
                    </span>
                  </p>
                  <p className="mt-1 font-display text-base font-semibold">{article.title}</p>
                  <p className="mt-1 text-sm text-muted">{article.snippet}</p>
                </div>

                <div className="flex shrink-0 items-center gap-5">
                  <LocaleLink
                    href={`/aiuto/${article.slug}`}
                    className="border-b border-line pb-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
                  >
                    {t.view}
                  </LocaleLink>
                  <LocaleLink
                    href={`/admin/aiuto/${article.id}`}
                    className="border-b border-line pb-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
                  >
                    {t.edit}
                  </LocaleLink>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
