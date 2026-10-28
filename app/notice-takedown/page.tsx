import type { Metadata } from "next";

import { submitTakedownNotice } from "@/app/actions/takedown";
import Link from "@/components/i18n/LocaleLink";
import PageHero from "@/components/pages/PageHero";
import JsonLd from "@/components/seo/JsonLd";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";

export const generateMetadata = (): Promise<Metadata> =>
  getPageMetadata((dict) => ({
    title: dict.takedown.title,
    description: dict.takedown.subtitle,
  }));

type TakedownPageProps = {
  searchParams: Promise<{ stato?: string; errore?: string }>;
};

const FIELD =
  "w-full rounded-none border border-line bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-cyan/70";

const TYPE_KEYS = [
  "copyright",
  "trademark",
  "privacy",
  "defamation",
  "illegal",
  "other",
] as const;

export default async function TakedownPage({ searchParams }: TakedownPageProps) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.takedown;
  const params = await searchParams;
  const sent = params.stato === "inviato";
  const error = typeof params.errore === "string" ? params.errore : null;

  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t.title,
    description: t.subtitle,
    url: absoluteUrl(withLocale(locale, "/notice-takedown")),
    inLanguage: locale,
  };

  return (
    <div>
      <JsonLd data={data} />

      <PageHero eyebrow={t.eyebrow} headline={t.title} lead={t.subtitle} />

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6">
        <div className="grid gap-10 border-t border-line pt-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,0.65fr)] lg:gap-16">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet">
              01 / {t.introTitle}
            </p>
            <h2 className="mt-2 font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-4xl">
              {t.introTitle}
            </h2>
            <ol className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
              {t.introSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="font-mono text-[10px] text-cyan">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <h3 className="mt-10 font-display text-lg font-semibold">{t.requirementsTitle}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              {t.requirements.map((item) => (
                <li key={item} className="border-l border-line pl-3">
                  {item}
                </li>
              ))}
            </ul>

            <p className="mt-8 max-w-xl text-xs leading-relaxed text-muted">
              {t.privacyNote}{" "}
              <Link href="/privacy" className="text-cyan hover:underline">
                {dict.footer.privacy}
              </Link>
            </p>
          </div>

          <section className="self-start border border-line bg-surface/40 p-5">
            <h2 className="font-display text-xl font-semibold">{t.formTitle}</h2>

            {sent ? (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 border border-cyan/40 bg-cyan/10 px-4 py-3 text-sm text-white"
              >
                <p className="font-display font-semibold">{t.successTitle}</p>
                <p className="mt-1 text-muted">{t.successText}</p>
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="mt-4 border border-pink/40 bg-pink/10 px-4 py-3 text-sm text-white"
              >
                <p className="font-display font-semibold">{t.errorTitle}</p>
                <p className="mt-1 text-muted">
                  {error === "invio" ? t.errorSend : t.errorFields}
                </p>
              </div>
            ) : null}

            <form action={submitTakedownNotice} className="mt-5 space-y-4">
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <div>
                <label htmlFor="type" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {t.type}
                </label>
                <select id="type" name="type" required defaultValue="copyright" className={FIELD}>
                  {TYPE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t.typeOptions[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    {t.name}
                  </label>
                  <input id="name" name="name" type="text" required minLength={2} maxLength={120} autoComplete="name" className={FIELD} />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    {t.email}
                  </label>
                  <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" className={FIELD} />
                </div>
              </div>

              <div>
                <label htmlFor="organization" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {t.organization}
                </label>
                <input id="organization" name="organization" type="text" maxLength={160} className={FIELD} />
              </div>

              <div>
                <label htmlFor="target_url" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {t.targetUrl}
                </label>
                <input id="target_url" name="target_url" type="url" required maxLength={500} placeholder="https://getopenstage.it/..." className={FIELD} />
                <span className="mt-1 block text-[10px] text-muted">{t.targetUrlHint}</span>
              </div>

              <div>
                <label htmlFor="description" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {t.description}
                </label>
                <textarea id="description" name="description" required minLength={20} maxLength={4000} rows={5} className={`${FIELD} resize-y`} />
                <span className="mt-1 block text-[10px] text-muted">{t.descriptionHint}</span>
              </div>

              <div>
                <label htmlFor="evidence_url" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {t.evidenceUrl}
                </label>
                <input id="evidence_url" name="evidence_url" type="url" maxLength={500} className={FIELD} />
              </div>

              <label className="flex items-start gap-2 text-xs leading-relaxed text-white">
                <input type="checkbox" name="good_faith" required className="mt-0.5" />
                <span>{t.goodFaith}</span>
              </label>

              <label className="flex items-start gap-2 text-xs leading-relaxed text-white">
                <input type="checkbox" name="accuracy" required className="mt-0.5" />
                <span>{t.accuracy}</span>
              </label>

              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center border border-violet-strong bg-violet-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
              >
                {t.submit}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
