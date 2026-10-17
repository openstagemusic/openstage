import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AccountForm, { type AccountSubject } from "@/components/account/AccountForm";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import LocaleLink from "@/components/i18n/LocaleLink";
import { canManageArtistProfile, canManageVenueProfile } from "@/lib/auth/roles";
import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { artistPath, venuePath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return {
    title: dict.account.title,
    description: dict.account.subtitle,
    robots: { index: false, follow: false },
  };
}

/**
 * La propria scheda: dati, stato della verifica e collegamento alla pagina
 * pubblica. È qui che si vede se la verifica è arrivata e perché conta.
 */
export default async function AccountPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  const dict = getDictionary(locale);
  const t = dict.account;

  const artist = canManageArtistProfile(session.role)
    ? await getArtistByProfileId(session.id)
    : null;
  const venue = canManageVenueProfile(session.role) ? await getVenueByProfileId(session.id) : null;

  const subject: AccountSubject | null = artist
    ? {
        kind: "artist",
        values: {
          id: artist.id,
          name: artist.name,
          city: artist.city ?? "",
          genre: artist.genre ?? "",
          spotifyUrl: artist.spotifyUrl ?? "",
          bio: artist.bio ?? "",
        },
      }
    : venue
      ? {
          kind: "venue",
          values: {
            id: venue.id,
            name: venue.name,
            city: venue.city ?? "",
            address: venue.address ?? "",
            website: venue.website ?? "",
            capacity: venue.capacity ? String(venue.capacity) : "",
          },
        }
      : null;

  const publicPath = artist ? artistPath(artist) : venue ? venuePath(venue) : null;
  const verified = artist?.verified === true || venue?.verified === true;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <div
        className="h-1.5 w-full rounded-full bg-gradient-to-r from-violet via-cyan to-pink"
        aria-hidden="true"
      />

      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-2 text-sm text-muted">{t.subtitle}</p>
      <p className="mt-1 text-xs text-muted">{session.email}</p>

      {session.role === "admin" ? (
        <section className="glass mt-8 rounded-3xl border border-white/10 p-6">
          <h2 className="font-display text-xl font-semibold">{t.adminTitle}</h2>
          <p className="mt-2 text-sm text-muted">{t.adminText}</p>
          <LocaleLink
            href="/admin"
            className="mt-4 inline-block rounded-full border border-pink/40 px-4 py-2 text-sm text-white transition-colors hover:bg-pink/10"
          >
            {t.adminCta}
          </LocaleLink>
        </section>
      ) : null}

      {session.role === "fan" ? (
        <section className="glass mt-8 rounded-3xl border border-white/10 p-6">
          <h2 className="font-display text-xl font-semibold">{t.fanTitle}</h2>
          <p className="mt-2 text-sm text-muted">{t.fanText}</p>
          <LocaleLink
            href="/onboarding/role"
            className="mt-4 inline-block rounded-full border border-cyan/40 px-4 py-2 text-sm text-white transition-colors hover:bg-cyan/10"
          >
            {t.fanCta}
          </LocaleLink>
        </section>
      ) : null}

      {subject ? (
        <section className="glass mt-8 rounded-3xl border border-white/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">
              {subject.kind === "artist" ? t.artistTitle : t.venueTitle}
            </h2>

            {verified ? (
              <VerifiedBadge dict={dict.directory} />
            ) : (
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-muted">
                {t.statusPending}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-muted">
            {verified ? t.statusVerifiedText : t.statusPendingText}
          </p>

          {publicPath ? (
            <LocaleLink
              href={publicPath}
              className="mt-3 inline-block text-sm text-cyan transition-opacity hover:opacity-80"
            >
              {t.viewPublic} →
            </LocaleLink>
          ) : null}

          <AccountForm subject={subject} dict={t} />
        </section>
      ) : null}

      {artist ? null : session.role === "artist" ? (
        <section className="glass mt-8 rounded-3xl border border-white/10 p-6">
          <h2 className="font-display text-xl font-semibold">{t.noArtistTitle}</h2>
          <p className="mt-2 text-sm text-muted">{t.noArtistText}</p>
          <LocaleLink
            href="/onboarding/artist"
            className="mt-4 inline-block rounded-full border border-violet/40 px-4 py-2 text-sm text-white transition-colors hover:bg-violet/10"
          >
            {t.noArtistCta}
          </LocaleLink>
        </section>
      ) : null}

      {venue ? null : session.role === "venue" ? (
        <section className="glass mt-8 rounded-3xl border border-white/10 p-6">
          <h2 className="font-display text-xl font-semibold">{t.noVenueTitle}</h2>
          <p className="mt-2 text-sm text-muted">{t.noVenueText}</p>
          <LocaleLink
            href="/onboarding/venue"
            className="mt-4 inline-block rounded-full border border-cyan/40 px-4 py-2 text-sm text-white transition-colors hover:bg-cyan/10"
          >
            {t.noVenueCta}
          </LocaleLink>
        </section>
      ) : null}
    </div>
  );
}
