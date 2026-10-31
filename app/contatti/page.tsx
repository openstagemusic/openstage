import type { Metadata } from "next";

import Link from "@/components/i18n/LocaleLink";
import PageHero from "@/components/pages/PageHero";
import JsonLd from "@/components/seo/JsonLd";
import { submitContact } from "@/app/actions/contact";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";

export const generateMetadata = (): Promise<Metadata> =>
  getPageMetadata((dict) => dict.pages.contact);

type ContactPageProps = {
  searchParams: Promise<{ stato?: string; errore?: string; argomento?: string }>;
};

const TOPIC_KEYS = ["general", "artist", "venue", "report", "privacy", "other"] as const;

const FIELD =
  "os-field text-sm";

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.pages.contact;
  const params = await searchParams;
  const sent = params.stato === "inviato";
  const error = typeof params.errore === "string" ? params.errore : null;
  const topic = TOPIC_KEYS.includes(params.argomento as (typeof TOPIC_KEYS)[number])
    ? (params.argomento as (typeof TOPIC_KEYS)[number])
    : "general";

  const data = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: t.title,
    description: t.description,
    url: absoluteUrl(withLocale(locale, "/contatti")),
    inLanguage: locale,
  };

  return (
    <div>
      <JsonLd data={data} />

      <PageHero eyebrow={t.eyebrow} headline={t.headline} lead={t.lead}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href="#modulo"
            className="inline-flex rounded-none bg-violet-strong px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {t.formTitle} <span aria-hidden="true">↓</span>
          </Link>
          <Link
            href="/faq"
            className="inline-flex border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
          >
            {dict.footer.faq} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </PageHero>

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        <section id="modulo" className="border-t border-line py-10 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,0.55fr)] lg:gap-16">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet">
                01 / {t.formTitle}
              </p>
              <h2 className="mt-2 font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-4xl">
                {t.formTitle}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t.formText}</p>

              {sent ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-6 border border-cyan/40 bg-cyan/10 px-4 py-3 text-sm text-white"
                >
                  <p className="font-display font-semibold">{t.successTitle}</p>
                  <p className="mt-1 text-muted">{t.successText}</p>
                </div>
              ) : null}

              {error ? (
                <div
                  role="alert"
                  className="mt-6 border border-pink/40 bg-pink/10 px-4 py-3 text-sm text-white"
                >
                  <p className="font-display font-semibold">{t.errorTitle}</p>
                  <p className="mt-1 text-muted">
                    {error === "invio" ? t.failedText : t.errorText}
                  </p>
                </div>
              ) : null}

              <form action={submitContact} className="mt-8 space-y-5">
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
                    >
                      {t.fields.name}
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      className={FIELD}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
                    >
                      {t.fields.email}
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      maxLength={160}
                      autoComplete="email"
                      className={FIELD}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="topic"
                    className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
                  >
                    {t.fields.topic}
                  </label>
                  <select id="topic" name="topic" required defaultValue={topic} className={FIELD}>
                    {TOPIC_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {t.topics[key]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
                  >
                    {t.fields.message}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    minLength={10}
                    maxLength={4000}
                    rows={7}
                    placeholder={t.fields.messagePlaceholder}
                    className={`${FIELD} resize-y`}
                  />
                </div>

                <div className="flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-md text-xs leading-relaxed text-muted">
                    {t.privacy}{" "}
                    <Link href="/privacy" className="text-cyan hover:underline">
                      {t.privacyCta}
                    </Link>
                  </p>

                  <button
                    type="submit"
                    className="inline-flex shrink-0 rounded-none bg-violet-strong px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
                  >
                    {t.submit}
                  </button>
                </div>
              </form>
            </div>

            <aside className="self-start border-t border-line pt-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
                02 / {t.directTitle}
              </p>
              <h3 className="mt-2 font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
                {t.directTitle}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t.directText}</p>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/artisti"
                  className="inline-flex border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
                >
                  {t.directCta} <span aria-hidden="true">↗</span>
                </Link>
                <Link
                  href="/locali"
                  className="inline-flex border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
                >
                  {t.venueCta} <span aria-hidden="true">↗</span>
                </Link>
                <Link
                  href="/faq"
                  className="inline-flex border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
                >
                  {dict.footer.faq} <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
