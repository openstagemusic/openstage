import type { Metadata } from "next";
import { notFound } from "next/navigation";

import HelpFeedback from "@/components/help/HelpFeedback";
import Markdown from "@/components/help/Markdown";
import LocaleLink from "@/components/i18n/LocaleLink";
import { ACTION_LINE } from "@/components/ui/actions";
import { getHelpArticle, listRelatedArticles, plainText } from "@/lib/help/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";

type HelpArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: HelpArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const article = await getHelpArticle(slug, locale);

  if (!article || article.status !== "published") {
    return { title: dict.help.eyebrow };
  }

  return {
    title: article.title,
    description: plainText(article.body).slice(0, 160),
    alternates: { canonical: absoluteUrl(withLocale(locale, `/aiuto/${article.slug}`)) },
  };
}

export default async function HelpArticlePage({ params }: HelpArticlePageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.help;

  const article = await getHelpArticle(slug, locale);
  if (!article || article.status !== "published") notFound();

  const related = await listRelatedArticles(article, locale, 3);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <LocaleLink
        href="/aiuto"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {t.backToHelp}
      </LocaleLink>

      <header className="mt-8 border-b border-line pb-6">
        {article.categorySlug ? (
          <LocaleLink
            href={`/aiuto?categoria=${article.categorySlug}`}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan transition-colors hover:text-white"
          >
            {article.categoryName ?? t.categoryLabel}
          </LocaleLink>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
            {t.categoryLabel}
          </p>
        )}

        <h1 className="mt-3 text-balance font-poster text-4xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-6xl">
          {article.title}
        </h1>
      </header>

      <article className="mt-8">
        <Markdown source={article.body} />
      </article>

      <section className="mt-10 border-t border-line pt-6">
        <HelpFeedback articleId={article.id} dict={t} />
      </section>

      {related.length > 0 ? (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
            {t.relatedTitle}
          </h2>
          <ul className="mt-4">
            {related.map((item) => (
              <li key={item.id} className="border-b border-line">
                <LocaleLink
                  href={`/aiuto/${item.slug}`}
                  className="group flex flex-wrap items-baseline justify-between gap-3 py-3"
                >
                  <span className="text-sm text-white transition-colors group-hover:text-cyan">
                    {item.title}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {item.categoryName}
                  </span>
                </LocaleLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <LocaleLink href="/contatti" className={ACTION_LINE}>
          {t.contactCta} <span aria-hidden="true">→</span>
        </LocaleLink>
        <LocaleLink href="/aiuto" className={ACTION_LINE}>
          {t.backToHelp}
        </LocaleLink>
      </div>
    </div>
  );
}
