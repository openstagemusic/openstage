import type { Metadata } from "next";
import { redirect } from "next/navigation";

import TrendChart from "@/components/charts/TrendChart";
import LocaleLink from "@/components/i18n/LocaleLink";
import { ACTION_ARROW, ACTION_LINE, ACTION_SOLID } from "@/components/ui/actions";
import { getProfileAnalytics, type AnalyticsRange } from "@/lib/analytics/queries";
import { canManageEvents } from "@/lib/auth/roles";
import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { formatEventDate } from "@/lib/events/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return { title: dict.analytics.title, description: dict.analytics.text };
}

type StatsPageProps = {
  searchParams: Promise<{ range?: string }>;
};

/**
 * Statistiche complete: andamento, follower, serata per serata ed export.
 * Tutto aggregato: il database non conserva chi ha aperto la pagina.
 */
export default async function StatisticsPage({ searchParams }: StatsPageProps) {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));
  if (!canManageEvents(session.role)) redirect(withLocale(locale, "/dashboard"));

  const dict = getDictionary(locale);
  const a = dict.analytics;
  const t = dict.dashboard;

  const params = await searchParams;
  const days: AnalyticsRange = params.range === "90" ? 90 : 30;

  const [artistPage, venuePage] = await Promise.all([
    session.role === "artist" ? getArtistByProfileId(session.id) : Promise.resolve(null),
    session.role === "venue" ? getVenueByProfileId(session.id) : Promise.resolve(null),
  ]);

  const page = artistPage ?? venuePage;

  if (!page) redirect(withLocale(locale, "/dashboard"));

  const role = artistPage ? "artist" : "venue";
  const analytics = await getProfileAnalytics({
    profileId: session.id,
    role,
    pageId: page.id,
    days,
  });

  const delta = analytics.totalViews - analytics.previousViews;
  const hasPrevious = analytics.previousViews > 0;
  const deltaLabel = !hasPrevious
    ? a.deltaNoPrevious
    : delta === 0
      ? a.deltaFlat
      : delta > 0
        ? `+${delta} ${a.deltaUp}`
        : `${delta} ${a.deltaDown}`;

  const totals = analytics.events.reduce(
    (acc, event) => ({
      views: acc.views + event.views,
      saves: acc.saves + event.saves,
    }),
    { views: 0, saves: 0 }
  );

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
          {dict.dashboard.navStats}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-6xl">
          {a.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{a.text}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {([30, 90] as const).map((value) => (
            <LocaleLink
              key={value}
              href={`/dashboard/statistiche?range=${value}`}
              aria-current={days === value ? "page" : undefined}
              className={
                days === value
                  ? "border-b border-cyan pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan"
                  : "border-b border-transparent pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
              }
            >
              {value === 30 ? a.range30 : a.range90}
            </LocaleLink>
          ))}

          <a href={`/dashboard/statistiche/export?range=${days}`} className={ACTION_LINE}>
            {a.export} <span aria-hidden="true">↓</span>
          </a>
        </div>
      </header>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
              {a.views}
            </p>
            <p className="mt-1 font-poster text-7xl leading-none tracking-[-0.03em] sm:text-8xl">
              {analytics.totalViews}
            </p>
            <p className="mt-2 text-sm text-muted">
              <span
                className={delta > 0 ? "text-cyan" : delta < 0 ? "text-pink" : "text-muted"}
              >
                {deltaLabel}
              </span>{" "}
              {hasPrevious ? a.deltaVs : null}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-3">
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {a.profileViews}
              </dt>
              <dd className="font-display text-xl tabular-nums">{analytics.profileViews}</dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {a.eventViews}
              </dt>
              <dd className="font-display text-xl tabular-nums">{analytics.eventViews}</dd>
            </div>
            {role === "artist" ? (
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  {a.epkViews}
                </dt>
                <dd className="font-display text-xl tabular-nums">{analytics.epkViews}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <TrendChart
          className="mt-8 text-white"
          points={analytics.series}
          locale={locale}
          label={a.trendTitle}
          height={240}
        />
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {a.viewsHint}
        </p>
      </section>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
          {a.followerTitle}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {analytics.followers} {a.followers} · {analytics.newFollowers}{" "}
          {analytics.newFollowers === 1 ? a.followersNewOne : a.followersNew}
        </p>
        <TrendChart
          className="mt-6 text-white"
          points={analytics.followerSeries}
          locale={locale}
          label={a.followerTitle}
          accent="violet"
          height={180}
        />
      </section>

      <section className="mt-10 border-t border-line pt-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <h2 className="font-poster text-2xl uppercase leading-none tracking-[-0.01em]">
            {a.tableTitle}
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {a.tableViews} {totals.views} · {a.tableSaves} {totals.saves}
          </p>
        </div>

        {analytics.events.length === 0 ? (
          <p className="mt-4 border-l-2 border-line-strong pl-3 text-sm text-muted">
            {a.noEvents}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <thead>
                <tr className="border-y border-line">
                  {[a.tableEvent, a.tableDate, a.tableViews, a.tableSaves].map((heading, index) => (
                    <th
                      key={heading}
                      scope="col"
                      className={`py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted ${
                        index >= 2 ? "text-right" : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.events.map((event) => (
                  <tr key={event.id} className="border-b border-line">
                    <td className="py-3 pr-4">
                      <LocaleLink
                        href={`/dashboard/events/${event.id}`}
                        className="text-sm text-white transition-colors hover:text-cyan"
                      >
                        {event.title}
                      </LocaleLink>
                      {event.city ? (
                        <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                          {event.city}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                      {formatEventDate(event.startsAt, "Europe/Rome", locale).date}
                    </td>
                    <td className="py-3 text-right font-mono text-[11px] tabular-nums text-white">
                      {event.views}
                    </td>
                    <td className="py-3 text-right font-mono text-[11px] tabular-nums text-muted">
                      {event.saves}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {a.tableTotal}
                  </td>
                  <td />
                  <td className="py-3 text-right font-mono text-[11px] tabular-nums text-cyan">
                    {totals.views}
                  </td>
                  <td className="py-3 text-right font-mono text-[11px] tabular-nums text-cyan">
                    {totals.saves}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">{a.note}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <LocaleLink href="/dashboard" className={ACTION_SOLID}>
            {t.title}
            <span aria-hidden="true" className={ACTION_ARROW}>
              →
            </span>
          </LocaleLink>
          <LocaleLink href="/dashboard/events" className={ACTION_LINE}>
            {t.navEvents}
          </LocaleLink>
        </div>
      </section>
    </div>
  );
}
