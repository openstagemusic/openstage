import type { Metadata } from "next";
import { redirect } from "next/navigation";

import ProFeatureRequestForm from "@/components/pro/ProFeatureRequestForm";
import LocaleLink from "@/components/i18n/LocaleLink";
import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getProAccess, listMyProRequests, type ProRequest } from "@/lib/pro/queries";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

function requestStatusLabel(dict: ReturnType<typeof getDictionary>["pro"], request: ProRequest) {
  if (request.status === "reviewing") return dict.statusReviewing;
  if (request.status === "planned") return dict.statusPlanned;
  if (request.status === "released") return dict.statusReleased;
  if (request.status === "declined") return dict.statusDeclined;
  return dict.statusNew;
}

export default async function ProPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));
  if (session.role !== "artist" && session.role !== "venue") {
    redirect(withLocale(locale, "/dashboard"));
  }

  const dict = getDictionary(locale);
  const t = dict.pro;
  const role = session.role;

  const [page, access] = await Promise.all([
    role === "artist" ? getArtistByProfileId(session.id) : getVenueByProfileId(session.id),
    getProAccess(session.id, role),
  ]);

  const requests = access?.active ? await listMyProRequests(session.id) : [];
  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "long",
  });

  if (!page) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <LocaleLink
          href="/dashboard"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
        >
          ← {t.back}
        </LocaleLink>

        <header className="mt-8 border-b border-line pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.eyebrow}</p>
          <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-6xl">
            {t.title}
          </h1>
        </header>

        <section className="mt-8 max-w-2xl border-l-2 border-line-strong pl-4">
          <h2 className="font-display text-xl font-semibold">{dict.dashboard.noPageTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{dict.dashboard.noPageText}</p>
          <LocaleLink
            href={role === "artist" ? "/onboarding/artist" : "/onboarding/venue"}
            className="mt-4 inline-flex min-h-11 items-center bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {role === "artist" ? dict.dashboard.noPageArtistCta : dict.dashboard.noPageVenueCta}
          </LocaleLink>
        </section>
      </div>
    );
  }

  const statusLabel = access?.active
    ? t.active
    : access?.status === "expired"
      ? t.expired
      : access?.status === "revoked"
        ? t.revoked
        : access?.status === "refunded"
          ? t.refunded
          : t.preview;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <LocaleLink
        href="/dashboard"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {t.back}
      </LocaleLink>

      <header className="mt-8 border-b border-line pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-balance font-poster text-[clamp(2.75rem,8vw,5.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
          {t.title}
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{t.lead}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span
            className={
              access?.active
                ? "border border-cyan/40 bg-cyan/10 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan"
                : "border border-line px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted"
            }
          >
            {statusLabel}
          </span>
          {access?.active ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              {t.activeUntil} {date.format(new Date(access.validUntil))}
            </span>
          ) : null}
        </div>
      </header>

      <section className="border-b border-line py-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">01 / {t.noEyebrow}</p>
            <h2 className="mt-3 max-w-xl text-balance font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-5xl">
              {t.noTitle}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{t.noLead}</p>
          </div>

          <ul className="border-t border-line">
            {t.noItems.map((item, index) => (
              <li key={item.title} className="grid grid-cols-[2rem_1fr] gap-4 border-b border-line py-4">
                <span className="font-mono text-[10px] tracking-[0.12em] text-pink">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="border-b border-line py-10 sm:py-12">
        <p className="font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-5xl">
          {t.manifesto}
        </p>
      </div>

      <section className="border-b border-line py-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">02 / {t.toolsEyebrow}</p>
            <h2 className="mt-3 text-balance font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-5xl">
              {t.toolsTitle}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{t.toolsLead}</p>
          </div>

          <ol className="border-t border-line">
            {t.tools.map((tool, index) => (
              <li key={tool.name} className="grid grid-cols-[2rem_1fr] gap-4 border-b border-line py-4">
                <span className="font-mono text-[10px] tracking-[0.12em] text-violet">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-semibold">{tool.name}</h3>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      {t.preview}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{tool.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-line py-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">03 / {t.pactEyebrow}</p>
            <h2 className="mt-3 text-balance font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-5xl">
              {t.pactTitle}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{t.pactText}</p>
          </div>

          <ul className="border-t border-line">
            {t.pactPoints.map((point) => (
              <li key={point} className="flex gap-3 border-b border-line py-4 text-sm text-muted">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 bg-cyan" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-10 sm:py-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">04 / {t.requestEyebrow}</p>
        <h2 className="mt-3 text-balance font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-5xl">
          {t.requestTitle}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {access?.active ? t.requestLead : t.requestOnlyPro}
        </p>

        {access?.active ? <ProFeatureRequestForm dict={t} /> : null}

        {requests.length > 0 ? (
          <div className="mt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              {t.requestLatest}
            </p>
            <ul className="mt-3 border-t border-line">
              {requests.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-3"
                >
                  <span className="text-sm text-white">{request.title}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {requestStatusLabel(dict.pro, request)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : access?.active ? (
          <p className="mt-6 border-l-2 border-line-strong pl-3 text-sm text-muted">{t.requestEmpty}</p>
        ) : null}
      </section>

      <div className="border-y border-line bg-white/[0.02] px-5 py-5 text-sm leading-relaxed text-muted">
        {t.fundNote}
      </div>
    </div>
  );
}
