import type { Metadata } from "next";

import PageCta from "@/components/pages/PageCta";
import PageHero from "@/components/pages/PageHero";
import PageSection from "@/components/pages/PageSection";
import JsonLd from "@/components/seo/JsonLd";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";

export const generateMetadata = (): Promise<Metadata> =>
  getPageMetadata((dict) => dict.pages.about);

export default async function AboutPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.pages.about;
  const url = absoluteUrl(withLocale(locale, "/about"));

  const data = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: t.title,
    description: t.description,
    url,
    inLanguage: locale,
  };

  return (
    <div>
      <JsonLd data={data} />

      <PageHero
        eyebrow={t.eyebrow}
        headline={t.headline}
        accent={t.accent}
        lead={t.lead}
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <a
            href="#chi-siamo"
            className="inline-flex rounded-none bg-violet-strong px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {dict.home.explore} <span aria-hidden="true">↓</span>
          </a>
          <a
            href="#cosa-non-siamo"
            className="inline-flex border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
          >
            {t.notTitle} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </PageHero>

      <div id="chi-siamo" className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        <PageSection number="01" title={t.storyTitle}>
          <div className="space-y-5 text-sm leading-relaxed text-muted sm:text-base">
            {t.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </PageSection>

        <PageSection number="02" title={t.principlesTitle}>
          <ul className="border-t border-line">
            {t.principles.map((principle, index) => (
              <li
                key={principle.title}
                className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-line py-5"
              >
                <span className="font-mono text-[10px] tracking-[0.12em] text-violet">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">{principle.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{principle.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </PageSection>

        <PageSection
          id="cosa-non-siamo"
          number="03"
          title={t.notTitle}
        >
          <ul className="space-y-4">
            {t.not.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span aria-hidden="true" className="mt-0.5 font-mono text-pink">
                  ×
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </PageSection>
      </div>

      <PageCta
        title={t.ctaTitle}
        text={t.ctaText}
        primary={{ label: t.primaryCta, href: "/" }}
        secondary={{ label: t.secondaryCta, href: "/per-gli-artisti" }}
        tertiary={{ label: t.tertiaryCta, href: "/per-le-venue" }}
      />
    </div>
  );
}
