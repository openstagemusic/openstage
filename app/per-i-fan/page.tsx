import type { Metadata } from "next";

import FeatureArt from "@/components/pages/FeatureArt";
import FreeTools from "@/components/pages/FreeTools";
import Link from "@/components/i18n/LocaleLink";
import PageCta from "@/components/pages/PageCta";
import PageHero from "@/components/pages/PageHero";
import PageSection from "@/components/pages/PageSection";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> =>
  getPageMetadata((dict) => dict.pages.forFans);

/**
 * "Per i fan": la pagina che mancava.
 *
 * Non promette niente che non esista (niente recensioni, niente feed): spiega
 * cosa si può fare senza account e cosa serve l'account per fare.
 */
export default async function ForFansPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.pages.forFans;

  return (
    <div>
      <PageHero eyebrow={t.eyebrow} headline={t.headline} accent={t.accent} lead={t.lead}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href="/"
            className="inline-flex rounded-none bg-violet-strong px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {t.primaryCta}
          </Link>
          <Link
            href="/register"
            className="inline-flex border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
          >
            {t.secondaryCta} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </PageHero>

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        <PageSection number="01" title={t.introTitle}>
          <p className="text-sm leading-relaxed text-muted sm:text-base">{t.introText}</p>
          <FeatureArt variant="map" className="mt-6" />
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

        <PageSection number="03" title={t.toolsTitle}>
          <FreeTools items={t.tools} note={t.toolsNote} />
        </PageSection>

        <PageSection number="04" title={t.alertsTitle}>
          <p className="text-sm leading-relaxed text-muted sm:text-base">{t.alertsText}</p>
          <ul className="mt-5 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
            {t.alerts.map((alert) => (
              <li key={alert.title}>
                <h3 className="font-display text-sm font-semibold">{alert.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{alert.text}</p>
              </li>
            ))}
          </ul>
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
        primary={{ label: t.primaryCta, href: "/" }}
        secondary={{ label: t.secondaryCta, href: "/register" }}
      />
    </div>
  );
}
