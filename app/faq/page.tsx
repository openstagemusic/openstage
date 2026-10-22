import type { Metadata } from "next";

import PageCta from "@/components/pages/PageCta";
import PageHero from "@/components/pages/PageHero";
import JsonLd from "@/components/seo/JsonLd";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";

export const generateMetadata = (): Promise<Metadata> => getPageMetadata((dict) => dict.pages.faq);

export default async function FaqPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.pages.faq;
  const url = absoluteUrl(withLocale(locale, "/faq"));

  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url,
    inLanguage: locale,
    mainEntity: t.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div>
      <JsonLd data={data} />

      <PageHero eyebrow={t.eyebrow} headline={t.headline} accent={t.accent} lead={t.lead} />

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        <section className="border-t border-line py-10 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] lg:gap-14">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet">
                01 / FAQ
              </p>
              <h2 className="mt-2 max-w-md font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-4xl">
                {t.title}
              </h2>
            </div>

            <div className="divide-y divide-line border-y border-line">
              {t.items.map((item, index) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-5 [&::-webkit-details-marker]:hidden">
                    <span className="grid grid-cols-[2.25rem_1fr] gap-3">
                      <span className="font-mono text-[10px] tracking-[0.12em] text-violet">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display text-base font-semibold text-white">
                        {item.q}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 font-mono text-lg leading-none text-cyan transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 pl-[3.25rem] text-sm leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>

      <PageCta
        title={t.moreTitle}
        text={t.moreText}
        primary={{ label: t.moreCta, href: "/contatti" }}
        secondary={{ label: dict.nav.about, href: "/about" }}
      />
    </div>
  );
}
