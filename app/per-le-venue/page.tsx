import type { Metadata } from "next";

import Link from "@/components/i18n/LocaleLink";
import PageCta from "@/components/pages/PageCta";
import PageHero from "@/components/pages/PageHero";
import PageSection from "@/components/pages/PageSection";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> =>
  getPageMetadata((dict) => dict.pages.forVenues);

export default async function ForVenuesPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.pages.forVenues;

  return (
    <div>
      <PageHero eyebrow={t.eyebrow} headline={t.headline} accent={t.accent} lead={t.lead}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href="/register"
            className="inline-flex rounded-none bg-violet-strong px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {t.primaryCta}
          </Link>
          <Link
            href="/locali"
            className="inline-flex border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
          >
            {t.secondaryCta} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </PageHero>

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        <PageSection number="01" title={t.introTitle}>
          <p className="text-sm leading-relaxed text-muted sm:text-base">{t.introText}</p>
        </PageSection>

        <PageSection number="02" title={t.stepsTitle}>
          <ol className="border-t border-line">
            {t.steps.map((step, index) => (
              <li
                key={step.title}
                className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-line py-5"
              >
                <span className="font-mono text-[10px] tracking-[0.12em] text-violet">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </PageSection>

        <PageSection number="03" title={t.benefitsTitle}>
          <ul className="grid gap-5 sm:grid-cols-3">
            {t.benefits.map((benefit) => (
              <li key={benefit.title} className="border-t border-line pt-4">
                <h3 className="font-display text-sm font-semibold">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{benefit.text}</p>
              </li>
            ))}
          </ul>
        </PageSection>

        <PageSection number="04" title={t.claimTitle}>
          <p className="text-sm leading-relaxed text-muted sm:text-base">{t.claimText}</p>
          <p className="mt-4 border-l border-cyan/50 pl-4 text-sm leading-relaxed text-white/80">
            {t.claimNote}
          </p>
          <Link
            href="/locali"
            className="mt-6 inline-flex border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
          >
            {t.secondaryCta} <span aria-hidden="true">↗</span>
          </Link>
        </PageSection>

        <PageSection number="05" title={t.rulesTitle}>
          <ul className="space-y-4">
            {t.rules.map((rule) => (
              <li key={rule} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span aria-hidden="true" className="mt-0.5 font-mono text-cyan">
                  +
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </PageSection>
      </div>

      <PageCta
        title={t.ctaTitle}
        text={t.ctaText}
        primary={{ label: t.primaryCta, href: "/register" }}
        secondary={{ label: dict.nav.explore, href: "/" }}
      />
    </div>
  );
}
