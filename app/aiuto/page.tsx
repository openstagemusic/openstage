import type { Metadata } from "next";

import LocaleLink from "@/components/i18n/LocaleLink";
import PageCta from "@/components/pages/PageCta";
import { listHelpArticles, listHelpCategories } from "@/lib/help/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return {
    title: dict.help.eyebrow,
    description: dict.help.lead,
  };
}

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.help;

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const category = params.categoria ?? null;

  const [categories, articles] = await Promise.all([
    listHelpCategories(locale),
    listHelpArticles({ locale, query, category, limit: 40 }),
  ]);

  const activeCategory = categories.find((item) => item.slug === category) ?? null;
  const searching = query !== "" || Boolean(category);

  return (
    <div>
      <section className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16">
        <div className="border-b border-line pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-poster text-[clamp(2.5rem,8vw,6rem)] uppercase leading-[0.92] tracking-[-0.02em]">
            {t.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">{t.lead}</p>

          <form action="/aiuto" method="get" role="search" className="mt-8 flex flex-wrap items-end gap-4">
            <label htmlFor="help-q" className="sr-only">
              {t.searchLabel}
            </label>
            <input
              id="help-q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder={t.searchPlaceholder}
              className="os-field max-w-xl flex-1 text-sm"
            />
            {category ? <input type="hidden" name="categoria" value={category} /> : null}
            <button
              type="submit"
              className="inline-flex min-h-11 items-center bg-violet-strong px-5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
            >
              {t.searchLabel}
            </button>
            {searching ? (
              <LocaleLink
                href="/aiuto"
                className="inline-flex min-h-11 items-center border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
              >
                {t.clear}
              </LocaleLink>
            ) : null}
          </form>
        </div>

        {searching ? (
          <section className="mt-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {activeCategory ? activeCategory.name : t.searchLabel} · {articles.length}{" "}
              {articles.length === 1 ? t.resultsOne : t.resultsMany}
            </p>

            {articles.length > 0 ? (
              <ul className="mt-4 border-t border-line">
                {articles.map((article) => (
                  <li key={article.id} className="border-b border-line">
                    <LocaleLink href={`/aiuto/${article.slug}`} className="group block py-5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">
                        {article.categoryName ?? t.categoryLabel}
                      </span>
                      <span className="mt-1 block font-display text-lg font-semibold leading-tight transition-colors group-hover:text-cyan">
                        {article.title}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted">
                        {article.snippet}
                      </span>
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 border-t border-line pt-6">
                <h2 className="font-poster text-2xl uppercase leading-none">{t.noResultsTitle}</h2>
                <p className="mt-2 max-w-xl text-sm text-muted">{t.noResultsText}</p>
              </div>
            )}
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="font-poster text-3xl uppercase leading-none tracking-[-0.01em] sm:text-4xl">
            {t.categoriesTitle}
          </h2>
          <ul className="mt-5 grid gap-x-10 sm:grid-cols-2">
            {categories.map((item) => (
              <li key={item.id} className="border-b border-line">
                <LocaleLink
                  href={`/aiuto?categoria=${item.slug}`}
                  className="group flex items-baseline justify-between gap-4 py-4"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-base font-semibold transition-colors group-hover:text-cyan">
                      {item.name}
                    </span>
                    {item.description ? (
                      <span className="mt-1 block text-sm text-muted">{item.description}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {item.articles} {item.articles === 1 ? t.articlesOne : t.articlesMany}
                  </span>
                </LocaleLink>
              </li>
            ))}
          </ul>
        </section>

        {!searching && articles.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-poster text-3xl uppercase leading-none tracking-[-0.01em] sm:text-4xl">
              {t.articlesMany}
            </h2>
            <ul className="mt-4 border-t border-line">
              {articles.slice(0, 10).map((article) => (
                <li key={article.id} className="border-b border-line">
                  <LocaleLink
                    href={`/aiuto/${article.slug}`}
                    className="group flex flex-wrap items-baseline justify-between gap-3 py-4"
                  >
                    <span className="font-display text-base font-semibold transition-colors group-hover:text-cyan">
                      {article.title}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      {article.categoryName}
                    </span>
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>

      <PageCta
        title={t.contactTitle}
        text={t.contactText}
        primary={{ label: t.contactCta, href: "/contatti" }}
        secondary={{ label: dict.nav.explore, href: "/" }}
      />
    </div>
  );
}
