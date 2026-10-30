import type { Metadata } from "next";
import { redirect } from "next/navigation";

import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import NeedsPageNotice from "@/components/dashboard/NeedsPageNotice";
import LocaleLink from "@/components/i18n/LocaleLink";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import { canManageEvents } from "@/lib/auth/roles";
import { listMyEvents, listSavedEvents } from "@/lib/dashboard/queries";
import { artistPath, venuePath } from "@/lib/events/paths";
import { formatEventDate, isEventPast } from "@/lib/events/format";
import { getFollowCount } from "@/lib/follows/queries";
import { SOCIAL_KINDS } from "@/lib/social/links";
import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";
import { getSessionProfile } from "@/lib/supabase/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return { title: dict.dashboard.overviewTitle, description: dict.dashboard.overviewText };
}

/** Panoramica: i numeri dei propri eventi e dei preferiti, con le scorciatoie. */
export default async function DashboardPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  const dict = getDictionary(locale);
  const t = dict.dashboard;
  const canManage = canManageEvents(session.role);

  const [events, saved, artistPage, venuePage] = await Promise.all([
    canManage ? listMyEvents(session.id) : Promise.resolve([]),
    listSavedEvents(),
    session.role === "artist" ? getArtistByProfileId(session.id) : Promise.resolve(null),
    session.role === "venue" ? getVenueByProfileId(session.id) : Promise.resolve(null),
  ]);

  const missingPage =
    session.role === "artist" ? !artistPage : session.role === "venue" ? !venuePage : false;

  const page = artistPage ?? venuePage;
  const pageKind = artistPage ? "artist" : venuePage ? "venue" : null;
  const followers = page && pageKind ? await getFollowCount(pageKind, page.id) : 0;
  const publicPath = artistPage
    ? artistPath(artistPage)
    : venuePage
      ? venuePath(venuePage)
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
      (event) =>
        event.status === "published" && !isEventPast(event.startsAt, event.timezone, now)
    )
    .slice(0, 3);

  const count = (status: "draft" | "published" | "cancelled") =>
    events.filter((event) => event.status === status).length;

  const cards = [
    ...(canManage
      ? [
          { label: t.statDrafts, value: count("draft"), href: "/dashboard/events#drafts" },
          { label: t.statPublished, value: count("published"), href: "/dashboard/events#upcoming" },
          { label: t.statCancelled, value: count("cancelled"), href: "/dashboard/events#cancelled" },
        ]
      : []),
    { label: t.statSaved, value: saved.length, href: "/dashboard/saved" },
  ];

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{t.title}</p>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
            {t.overviewTitle}
          </h1>
          {session.verified ? <VerifiedBadge label={dict.directory.badgeVerified} /> : null}
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.overviewText}</p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          {session.email}
        </p>
      </header>

      {missingPage ? (
        <div className="mt-8">
          <NeedsPageNotice
            role={session.role === "artist" ? "artist" : "venue"}
            dict={t}
          />
        </div>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <LocaleLink
            key={card.label}
            href={card.href}
            className="border border-line bg-surface/60 p-5 transition-colors hover:border-cyan/50"
          >
            <p className="font-poster text-4xl leading-none">{card.value}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {card.label}
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
              {t.statHint} <span aria-hidden="true">→</span>
            </p>
          </LocaleLink>
        ))}
      </div>

      {page && publicPath && !missingPage ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
                {t.pageTitle}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold">{page.name}</h2>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {page.city ?? ""}
            </p>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="border border-line bg-surface/60 p-5 lg:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {t.pageCompleteness}
                </p>
                <p className="font-poster text-3xl leading-none">{completenessPercent}%</p>
              </div>

              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completenessPercent}
                aria-label={t.pageCompleteness}
                className="mt-3 h-1.5 w-full bg-line"
              >
                <div className="h-full bg-cyan" style={{ width: `${completenessPercent}%` }} />
              </div>

              {missingFields.length > 0 ? (
                <>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    {t.pageMissing}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    {missingFields.map((field) => (
                      <li key={field} className="border-l-2 border-line-strong pl-2">
                        {field}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-4 text-sm text-cyan">{t.pageComplete}</p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <LocaleLink
                  href="/account"
                  className="inline-flex min-h-11 items-center justify-center border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
                >
                  {t.pageEdit}
                </LocaleLink>
                <LocaleLink
                  href={publicPath}
                  className="inline-flex min-h-11 items-center justify-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-line-strong"
                >
                  {t.pageView}
                </LocaleLink>
                <CopyLinkButton
                  url={absoluteUrl(publicPath)}
                  label={t.pageCopy}
                  copiedLabel={t.pageCopied}
                />
              </div>
            </div>

            <div className="border border-line bg-surface/60 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {t.followersTitle}
              </p>
              <p className="mt-3 font-poster text-5xl leading-none">{followers}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted">{t.followersText}</p>
            </div>
          </div>

          {upcoming.length > 0 ? (
            <div className="mt-3 border border-line bg-surface/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{t.nextEventsTitle}</h3>
                <LocaleLink
                  href="/dashboard/events#upcoming"
                  className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan transition-colors hover:text-white"
                >
                  {t.nextEventsAll} <span aria-hidden="true">→</span>
                </LocaleLink>
              </div>

              <ul className="mt-3 divide-y divide-line border-t border-line">
                {upcoming.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-3"
                  >
                    <LocaleLink
                      href={`/dashboard/events/${event.id}`}
                      className="font-display text-base font-semibold hover:text-cyan"
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
            </div>
          ) : (
            <p className="mt-3 border-l-2 border-line-strong pl-3 text-sm text-muted">
              {t.nextEventsEmpty}
            </p>
          )}
        </section>
      ) : null}

      {canManage && !missingPage ? (
        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:flex-wrap">
          <LocaleLink
            href="/dashboard/events/new"
            className="inline-flex min-h-11 items-center justify-center border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {t.navNew}
          </LocaleLink>
          <LocaleLink
            href="/dashboard/events"
            className="inline-flex min-h-11 items-center justify-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-line-strong"
          >
            {t.navEvents}
          </LocaleLink>
        </div>
      ) : null}
    </div>
  );
}
