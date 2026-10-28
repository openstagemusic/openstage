import type { Metadata } from "next";
import { redirect } from "next/navigation";

import EventTeaser from "@/components/events/EventTeaser";
import LocaleLink from "@/components/i18n/LocaleLink";
import { listSavedEvents } from "@/lib/dashboard/queries";
import { artistPath, venuePath } from "@/lib/events/paths";
import { listFollowedPages } from "@/lib/follows/queries";
import { isEventPast } from "@/lib/events/format";
import { isCancelled } from "@/lib/events/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ForYouPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  const dict = getDictionary(locale);
  const t = dict.dashboard;
  const now = new Date();
  const [saved, followed] = await Promise.all([
    listSavedEvents(),
    listFollowedPages(session.id),
  ]);
  const upcoming = saved
    .filter((event) => !isCancelled(event) && !isEventPast(event.startsAt, event.timezone, now))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{t.navForYou}</p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {t.forYouTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.forYouText}</p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        <LocaleLink
          href="/dashboard/notifiche"
          className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-line-strong"
        >
          {t.forYouNotifications}
        </LocaleLink>
        <LocaleLink
          href="/dashboard/impostazioni"
          className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
        >
          {t.forYouSettings}
        </LocaleLink>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">{t.forYouFollowedTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t.forYouFollowedText}</p>

        {followed.artists.length === 0 && followed.venues.length === 0 ? (
          <p className="mt-4 border-l-2 border-line-strong pl-3 text-sm text-muted">
            {t.forYouFollowedEmpty}
          </p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {followed.artists.length > 0 ? (
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
                  {t.forYouFollowedArtists}
                </h3>
                <ul className="mt-2 divide-y divide-line border-t border-line">
                  {followed.artists.map((artist) => (
                    <li key={artist.id} className="py-2">
                      <LocaleLink
                        href={artistPath({ slug: artist.slug })}
                        className="font-display text-base font-semibold hover:text-cyan"
                      >
                        {artist.name}
                      </LocaleLink>
                      {artist.city ? (
                        <span className="ml-2 text-xs text-muted">{artist.city}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {followed.venues.length > 0 ? (
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
                  {t.forYouFollowedVenues}
                </h3>
                <ul className="mt-2 divide-y divide-line border-t border-line">
                  {followed.venues.map((venue) => (
                    <li key={venue.id} className="py-2">
                      <LocaleLink
                        href={venuePath({ slug: venue.slug })}
                        className="font-display text-base font-semibold hover:text-cyan"
                      >
                        {venue.name}
                      </LocaleLink>
                      {venue.city ? (
                        <span className="ml-2 text-xs text-muted">{venue.city}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <h2 className="mt-10 font-display text-2xl font-semibold">{t.forYouUpcoming}</h2>

      {upcoming.length === 0 ? (
        <section className="mt-5 border border-line bg-surface/60 p-6">
          <h3 className="font-display text-lg font-semibold">{t.forYouEmptyTitle}</h3>
          <p className="mt-2 text-sm text-muted">{t.forYouEmptyText}</p>
          <LocaleLink
            href="/"
            className="mt-4 inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-line-strong"
          >
            {dict.events.backToExplore}
          </LocaleLink>
        </section>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {upcoming.map((event) => (
            <EventTeaser key={event.id} event={event} locale={locale} dict={dict} />
          ))}
        </div>
      )}
    </div>
  );
}
