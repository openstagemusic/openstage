import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LocaleLink from "@/components/i18n/LocaleLink";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { adminSearch } from "@/lib/admin/search";
import type { UserRole } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { artistPath, eventPath, venuePath } from "@/lib/events/paths";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const reasonKey = {
  fake: "reasonFake",
  wrong_info: "reasonWrongInfo",
  spam: "reasonSpam",
  offensive: "reasonOffensive",
  other: "reasonOther",
} as const;

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.admin;
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const results = await adminSearch(query);

  const roleLabels: Record<UserRole, string> = {
    fan: dict.nav.roleFan,
    artist: dict.nav.roleArtist,
    venue: dict.nav.roleVenue,
    admin: dict.nav.roleAdmin,
  };

  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const total =
    results.users.length +
    results.artists.length +
    results.venues.length +
    results.events.length +
    results.messages.length +
    results.emails.length +
    results.reports.length;

  const sections: Array<{ title: string; count: number; body: React.ReactNode }> = [
    {
      title: t.searchUsers,
      count: results.users.length,
      body: results.users.length ? (
        <ul className="mt-3 divide-y divide-line border border-line">
          {results.users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="break-all text-sm text-white">{user.email ?? "—"}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {user.fullName ?? "—"} · {roleLabels[user.role]}
                  {user.suspended ? ` · ${t.userSuspended}` : ""}
                  {user.role === "artist" || user.role === "venue"
                    ? ` · ${user.verified ? t.userVerified : t.userNotVerified}`
                    : ""}
                </p>
              </div>
              <LocaleLink
                href="/admin/utenti"
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-cyan hover:opacity-80"
              >
                {t.searchOpen}
              </LocaleLink>
            </li>
          ))}
        </ul>
      ) : null,
    },
    {
      title: t.searchArtists,
      count: results.artists.length,
      body: results.artists.length ? (
        <ul className="mt-3 divide-y divide-line border border-line">
          {results.artists.map((artist) => (
            <li key={artist.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="text-sm text-white">{artist.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {artist.city ?? "—"}
                  {artist.genre ? ` · ${artist.genre}` : ""}
                  {` · ${artist.claimed ? t.directoryClaimed : t.directoryUnclaimed}`}
                </p>
              </div>
              <LocaleLink
                href={artistPath({ slug: artist.slug })}
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-cyan hover:opacity-80"
              >
                {t.searchOpen}
              </LocaleLink>
            </li>
          ))}
        </ul>
      ) : null,
    },
    {
      title: t.searchVenues,
      count: results.venues.length,
      body: results.venues.length ? (
        <ul className="mt-3 divide-y divide-line border border-line">
          {results.venues.map((venue) => (
            <li key={venue.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="text-sm text-white">{venue.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {[venue.city, venue.address].filter(Boolean).join(" · ") || "—"}
                  {` · ${venue.claimed ? t.directoryClaimed : t.directoryUnclaimed}`}
                </p>
              </div>
              <LocaleLink
                href={venuePath({ slug: venue.slug })}
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-cyan hover:opacity-80"
              >
                {t.searchOpen}
              </LocaleLink>
            </li>
          ))}
        </ul>
      ) : null,
    },
    {
      title: t.searchEvents,
      count: results.events.length,
      body: results.events.length ? (
        <ul className="mt-3 divide-y divide-line border border-line">
          {results.events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="text-sm text-white">{event.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {date.format(new Date(event.startsAt))} · {event.city ?? "—"} · {event.status}
                </p>
              </div>
              <LocaleLink
                href={eventPath({ id: event.id, slug: event.slug, city: event.city })}
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-cyan hover:opacity-80"
              >
                {t.searchOpen}
              </LocaleLink>
            </li>
          ))}
        </ul>
      ) : null,
    },
    {
      title: t.searchMessages,
      count: results.messages.length,
      body: results.messages.length ? (
        <ul className="mt-3 divide-y divide-line border border-line">
          {results.messages.map((message) => (
            <li key={message.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="text-sm text-white">
                  {message.name} · <span className="text-muted">{message.email}</span>
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{message.preview}</p>
              </div>
              <LocaleLink
                href="/admin/messaggi"
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-cyan hover:opacity-80"
              >
                {t.searchOpen}
              </LocaleLink>
            </li>
          ))}
        </ul>
      ) : null,
    },
    {
      title: t.searchEmails,
      count: results.emails.length,
      body: results.emails.length ? (
        <ul className="mt-3 divide-y divide-line border border-line">
          {results.emails.map((email) => (
            <li key={email.id} className="p-3">
              <p className="break-all text-sm text-white">{email.to}</p>
              <p className="mt-0.5 text-xs text-muted">
                {email.subject} · {email.status}
              </p>
            </li>
          ))}
        </ul>
      ) : null,
    },
    {
      title: t.searchReports,
      count: results.reports.length,
      body: results.reports.length ? (
        <ul className="mt-3 divide-y divide-line border border-line">
          {results.reports.map((report) => (
            <li key={report.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="text-sm text-white">{report.eventTitle ?? "—"}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {t[reasonKey[report.reason as keyof typeof reasonKey] ?? "reasonOther"]} ·{" "}
                  {report.status}
                  {report.note ? ` · ${report.note}` : ""}
                </p>
              </div>
              <LocaleLink
                href="/admin/segnalazioni"
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-cyan hover:opacity-80"
              >
                {t.searchOpen}
              </LocaleLink>
            </li>
          ))}
        </ul>
      ) : null,
    },
  ].filter((section) => section.count > 0);

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {t.controlRoom}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {t.searchTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.searchSubtitle}</p>

        <form
          action={withLocale(locale, "/admin/cerca")}
          method="get"
          className="mt-6 flex flex-col gap-2 sm:flex-row"
        >
          <label htmlFor="admin-search-page" className="sr-only">
            {t.searchTitle}
          </label>
          <input
            id="admin-search-page"
            name="q"
            type="search"
            minLength={2}
            required
            defaultValue={query}
            placeholder={t.searchPlaceholder}
            className="min-h-11 flex-1 border border-line bg-surface px-4 py-3 text-sm text-white outline-none placeholder:text-muted focus:border-cyan"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center border border-cyan bg-cyan px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-bg transition-colors hover:bg-cyan/90"
          >
            {t.searchButton}
          </button>
        </form>
      </header>

      {query.length < 2 ? (
        <p className="mt-6 border-l-2 border-line-strong pl-3 text-sm text-muted">{t.searchHint}</p>
      ) : total === 0 ? (
        <p className="mt-6 border-l-2 border-line-strong pl-3 text-sm text-muted">{t.searchEmpty}</p>
      ) : (
        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {t.searchResultsFor.replace("{query}", query)} · {total}
          </p>

          <div className="mt-5 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-lg font-semibold">
                  {section.title} <span className="text-muted">({section.count})</span>
                </h2>
                {section.body}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
