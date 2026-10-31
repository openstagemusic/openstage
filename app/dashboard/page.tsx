import type { Metadata } from "next";
import { redirect } from "next/navigation";

import TrendChart from "@/components/charts/TrendChart";
import ValueBars from "@/components/charts/ValueBars";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import NeedsPageNotice from "@/components/dashboard/NeedsPageNotice";
import BrandBanner from "@/components/directory/BrandBanner";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import LocaleLink from "@/components/i18n/LocaleLink";
import { ACTION_ARROW, ACTION_LINE, ACTION_SOLID } from "@/components/ui/actions";
import { getProfileAnalytics } from "@/lib/analytics/queries";
import { canManageEvents } from "@/lib/auth/roles";
import { listMyEvents, listSavedEvents } from "@/lib/dashboard/queries";
import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { artistPath, venuePath } from "@/lib/events/paths";
import { formatEventDate, isEventPast } from "@/lib/events/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";
import { SOCIAL_KINDS } from "@/lib/social/links";
import { getSessionProfile } from "@/lib/supabase/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return { title: dict.dashboard.overviewTitle, description: dict.dashboard.overviewText };
}

/**
 * Panoramica: la scheda, i numeri veri e le serate in programma.
 *
 * È un registro editoriale, non un cruscotto: cifre grandi in poster, filetti
 * sottili, nessuna card colorata. Le statistiche arrivano da `view_daily`, che
 * conta solo aperture aggregate.
 */
export default async function DashboardPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  const dict = getDictionary(locale);
  const t = dict.dashboard;
  const a = dict.analytics;
  const canManage = canManageEvents(session.role);
  const isArtist = session.role === "artist";
  const isVenue = session.role === "venue";

  const [events, saved, artistPage, venuePage] = await Promise.all([
    canManage ? listMyEvents(session.id) : Promise.resolve([]),
    listSavedEvents(),
    isArtist ? getArtistByProfileId(session.id) : Promise.resolve(null),
    isVenue ? getVenueByProfileId(session.id) : Promise.resolve(null),
  ]);

  const page = artistPage ?? venuePage;
  const pageKind: "artist" | "venue" | null = artistPage ? "artist" : venuePage ? "venue" : null;
  const missingPage = (isArtist && !artistPage) || (isVenue && !venuePage);

  const publicPath = artistPage
    ? artistPath(artistPage)
    : venuePage
      ? venuePath(venuePage)
      : null;

  const analytics =
    page && pageKind
      ? await getProfileAnalytics({
          profileId: session.id,
          role: pageKind,
          pageId: page.id,
          days: 30,
        })
      : null;

  // Completezza calcolata sui campi reali: nessun punteggio inventato.
  const completeness = artistPage
    ? [
        { label: t.fields.name, done: Boolean(artistPage.name.trim()) },
        { label: t.fields.city, done: Boolean(artistPage.city) },
        { label: t.fields.genre, done: Boolean(artistPage.genre) },
        { label: t.fields.bio, done: Boolean(artistPage.bio?.trim()) },
        { label: t.fields.spotify, done: Boolean(artistPage.spotifyUrl) },
        {
          label: t.fields.links,
          done: SOCIAL_KINDS.some(
            (kind) => kind !== "spotify" && Boolean(artistPage.links[kind])
          ),
        },
      ]
    : venuePage
      ? [
          { label: t.fields.name, done: Boolean(venuePage.name.trim()) },
          { label: t.fields.city, done: Boolean(venuePage.city) },
          { label: t.fields.address, done: Boolean(venuePage.address) },
          { label: t.fields.capacity, done: venuePage.capacity !== null },
          {
            label: t.fields.links,
            done: SOCIAL_KINDS.some((kind) => Boolean(venuePage.links[kind])),
          },
          {
            label: t.fields.map,
            done: venuePage.latitude !== null && venuePage.longitude !== null,
          },
        ]
      : [];

  const missingFields = completeness.filter((item) => !item.done).map((item) => item.label);
  const completenessPercent =
    completeness.length > 0
      ? Math.round(((completeness.length - missingFields.length) / completeness.length) * 100)
      : 0;

  const now = new Date();
  const upcoming = events
    .filter(
      (event) => event.status === "published" && !isEventPast(event.startsAt, event.timezone, now)
    )
    .slice(0, 4);

  const publishedCount = events.filter((event) => event.status === "published").length;
  const draftCount = events.filter((event) => event.status === "draft").length;
  const cancelledCount = events.filter((event) => event.status === "cancelled").length;

  const delta = analytics ? analytics.totalViews - analytics.previousViews : 0;
  const hasPrevious = (analytics?.previousViews ?? 0) > 0;
  const deltaLabel = !analytics
    ? ""
    : !hasPrevious
      ? a.deltaNoPrevious
      : delta === 0
        ? a.deltaFlat
        : delta > 0
          ? `+${delta} ${a.deltaUp}`
          : `${delta} ${a.deltaDown}`;

  const topEvents =
    analytics?.topEvents.map((event) => ({
      key: event.id,
      label: event.title,
      meta: [event.city, formatEventDate(event.startsAt, "Europe/Rome", locale).date]
        .filter(Boolean)
        .join(" · "),
      value: event.views,
      href: `/dashboard/events/${event.id}`,
    })) ?? [];

  const ledger = analytics
    ? [
        { label: a.followers, value: analytics.followers, href: "/dashboard/statistiche" },
        { label: a.bookings, value: analytics.bookings, href: "/dashboard/messaggi" },
        { label: a.saves, value: analytics.saves, href: "/dashboard/statistiche" },
        { label: t.statPublished, value: publishedCount, href: "/dashboard/events#upcoming" },
      ]
    : [];

  return (
    <div>
      {/* Testata: la scheda si presenta come sulla pagina pubblica. */}
      <header className="relative overflow-hidden border border-line">
        <div className="absolute inset-0">
          {page?.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.bannerUrl}
              alt=""
              className="h-full w-full scale-105 object-cover opacity-40 blur-[2px]"
            />
          ) : (
            <BrandBanner />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/85 to-bg/30" />

        <div className="relative flex flex-wrap items-end gap-5 p-5 pt-16 sm:p-8 sm:pt-24">
          {page?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.avatarUrl}
              alt=""
              className="h-20 w-20 shrink-0 border border-line-strong object-cover"
            />
          ) : null}

          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
              {t.overviewEyebrow}
            </p>
            <h1 className="mt-2 truncate font-poster text-4xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-6xl">
              {page?.name ?? session.email ?? t.overviewTitle}
            </h1>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {[page?.city, isArtist ? "Artista" : isVenue ? "Locale" : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          {session.verified ? (
            <div className="pb-1">
              <VerifiedBadge label={dict.directory.badgeVerified} />
            </div>
          ) : null}
        </div>
      </header>

      {missingPage ? (
        <div className="mt-8">
          <NeedsPageNotice role={isArtist ? "artist" : "venue"} dict={t} />
        </div>
      ) : null}

      {analytics ? (
        <section className="mt-10 border-t border-line pt-6">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
                {t.overviewViews} · {t.overviewRange}
              </p>
              <p className="mt-1 font-poster text-7xl leading-none tracking-[-0.03em] sm:text-8xl">
                {analytics.totalViews}
              </p>
              <p className="mt-2 text-sm text-muted">
                <span
                  className={
                    !hasPrevious
                      ? "text-muted"
                      : delta > 0
                        ? "text-cyan"
                        : delta < 0
                          ? "text-pink"
                          : "text-muted"
                  }
                >
                  {deltaLabel}
                </span>{" "}
                {hasPrevious ? a.deltaVs : null}
              </p>
            </div>

            <LocaleLink href="/dashboard/statistiche" className={ACTION_LINE}>
              {t.overviewAllStats}{" "}
              <span aria-hidden="true" className={ACTION_ARROW}>
                →
              </span>
            </LocaleLink>
          </div>

          <TrendChart
            className="mt-8 text-white"
            points={analytics.series}
            locale={locale}
            label={a.trendTitle}
            height={200}
          />

          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {a.viewsHint}
          </p>
        </section>
      ) : null}

      {analytics ? (
        <section className="mt-10 grid gap-10 border-t border-line pt-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
              {t.overviewNumbers}
            </h2>

            <dl className="mt-4 border-t border-line">
              {ledger.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 border-b border-line py-3"
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    {row.label}
                  </dt>
                  <dd className="font-display text-2xl tabular-nums leading-none">{row.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              {a.note}
            </p>
          </div>

          <div>
            <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
              {t.overviewTopEvents}
            </h2>
            <ValueBars
              className="mt-4"
              items={topEvents}
              emptyLabel={t.overviewEmptyStats}
            />
          </div>
        </section>
      ) : null}

      {page && publicPath && !missingPage ? (
        <section className="mt-10 border-t border-line pt-6">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
                {t.pageTitle}
              </p>
              <p className="mt-2 flex items-baseline gap-3">
                <span className="font-poster text-5xl leading-none tracking-[-0.02em]">
                  {completenessPercent}%
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {t.pageCompleteness}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <LocaleLink href="/account" className={ACTION_SOLID}>
                {t.pageEdit}
                <span aria-hidden="true" className={ACTION_ARROW}>
                  →
                </span>
              </LocaleLink>
              <LocaleLink href={publicPath} className={ACTION_LINE}>
                {t.pageView}
              </LocaleLink>
              <CopyLinkButton
                url={absoluteUrl(publicPath)}
                label={t.pageCopy}
                copiedLabel={t.pageCopied}
              />
            </div>
          </div>

          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completenessPercent}
            aria-label={t.pageCompleteness}
            className="mt-4 h-0.5 w-full bg-line"
          >
            <div className="h-full bg-cyan" style={{ width: `${completenessPercent}%` }} />
          </div>

          <ul className="mt-5 grid gap-x-10 sm:grid-cols-2">
            {completeness.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-4 border-b border-line py-2.5"
              >
                <span className={item.done ? "text-sm text-white" : "text-sm text-muted"}>
                  {item.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`font-mono text-[11px] ${item.done ? "text-cyan" : "text-muted"}`}
                >
                  {item.done ? "✓" : "+"}
                </span>
              </li>
            ))}
          </ul>

          {missingFields.length > 0 ? (
            <p className="mt-4 text-sm text-muted">
              {t.pageMissing}: {missingFields.join(" · ")}
            </p>
          ) : (
            <p className="mt-4 text-sm text-cyan">{t.pageComplete}</p>
          )}
        </section>
      ) : null}

      {canManage && !missingPage ? (
        <section className="mt-10 border-t border-line pt-6">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
              {t.nextEventsTitle}
            </h2>
            <LocaleLink href="/dashboard/events#upcoming" className={ACTION_LINE}>
              {t.nextEventsAll}{" "}
              <span aria-hidden="true" className={ACTION_ARROW}>
                →
              </span>
            </LocaleLink>
          </div>

          {upcoming.length > 0 ? (
            <ul className="mt-4 border-t border-line">
              {upcoming.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-3"
                >
                  <LocaleLink
                    href={`/dashboard/events/${event.id}`}
                    className="font-display text-base font-semibold transition-colors hover:text-cyan"
                  >
                    {event.title}
                  </LocaleLink>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    {formatEventDate(event.startsAt, event.timezone, locale).full}
                    {event.city ? ` · ${event.city}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 border-l-2 border-line-strong pl-3 text-sm text-muted">
              {t.nextEventsEmpty}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <LocaleLink href="/dashboard/events/new" className={ACTION_SOLID}>
              {t.navNew}
              <span aria-hidden="true" className={ACTION_ARROW}>
                →
              </span>
            </LocaleLink>
            <LocaleLink href="/dashboard/events" className={ACTION_LINE}>
              {t.navEvents}
            </LocaleLink>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {draftCount} {t.statDrafts.toLowerCase()} · {cancelledCount}{" "}
              {t.statCancelled.toLowerCase()}
            </span>
          </div>
        </section>
      ) : null}

      {!canManage ? (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
            {t.statSaved}
          </h2>
          <p className="mt-2 font-poster text-6xl leading-none">{saved.length}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <LocaleLink href="/dashboard/saved" className={ACTION_LINE}>
              {t.statSaved}
            </LocaleLink>
            <LocaleLink href="/dashboard/per-te" className={ACTION_LINE}>
              {t.navForYou}
            </LocaleLink>
          </div>
        </section>
      ) : null}
    </div>
  );
}
