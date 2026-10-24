import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AccountForm, { type AccountSubject } from "@/components/account/AccountForm";
import PendingRequestPanel from "@/components/claims/PendingRequestPanel";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import LocaleLink from "@/components/i18n/LocaleLink";
import { canManageArtistProfile, canManageVenueProfile, ROLE_LABEL_KEY } from "@/lib/auth/roles";
import { getMyPendingRequest } from "@/lib/claims/queries";
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

const actionLink =
  "inline-flex min-h-11 items-center justify-center border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors";

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

  // Una richiesta in attesa: finché non è decisa, il database non lascia creare
  // altre schede. Qui lo diciamo, con il modo per ritirarla.
  const pendingRequest = await getMyPendingRequest();

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
  const roleLabel = session.role ? dict.nav[ROLE_LABEL_KEY[session.role]] : null;
  const roleClass =
    session.role === "admin"
      ? "border-pink/50 bg-pink/10 text-white"
      : session.role === "artist"
        ? "border-violet/50 bg-violet/10 text-white"
        : session.role === "venue"
          ? "border-cyan/50 bg-cyan/10 text-white"
          : "border-line-strong text-muted";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <LocaleLink
        href="/dashboard"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {dict.dashboard.title}
      </LocaleLink>

      <header className="mt-6 border-b border-line pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.eyebrow}</p>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="font-poster text-[clamp(3rem,9vw,5.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
              {t.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4 lg:border-t-0 lg:pt-0">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                {t.signedInAs}
              </p>
              <p className="mt-1 max-w-[16rem] truncate font-mono text-[11px] text-white">
                {session.email}
              </p>
            </div>
            {roleLabel ? (
              <span
                className={`border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${roleClass}`}
              >
                {t.roleLabel}: {roleLabel}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mt-8 space-y-8">
        {pendingRequest ? (
          <PendingRequestPanel
            claimId={pendingRequest.id}
            subjectName={pendingRequest.subjectName}
            subjectHref={
              pendingRequest.subjectType === "artist"
                ? artistPath({ slug: pendingRequest.subjectSlug })
                : venuePath({ slug: pendingRequest.subjectSlug })
            }
            createdAt={pendingRequest.createdAt}
            dict={dict.claims}
          />
        ) : null}

        {subject ? (
          <section className="border border-line bg-surface/50 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <h2 className="font-display text-xl font-semibold">
                {subject.kind === "artist" ? t.artistTitle : t.venueTitle}
              </h2>

              {verified ? (
                <VerifiedBadge dict={dict.directory} />
              ) : (
                <span className="border border-line-strong px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                  {t.statusPending}
                </span>
              )}
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              {verified ? t.statusVerifiedText : t.statusPendingText}
            </p>

            {publicPath ? (
              <LocaleLink
                href={publicPath}
                className="mt-3 inline-flex items-center gap-2 border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-cyan transition-colors hover:border-cyan"
              >
                {t.viewPublic} →
              </LocaleLink>
            ) : null}

            <AccountForm subject={subject} dict={t} />
          </section>
        ) : null}

        {session.role === "admin" ? (
          <section className="border-l-2 border-pink bg-pink/[0.04] p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-pink">
              {t.adminTitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t.adminText}</p>
            <LocaleLink
              href="/admin"
              className={`${actionLink} mt-4 border-pink/50 hover:bg-pink/10`}
            >
              {t.adminCta}
            </LocaleLink>
          </section>
        ) : null}

        {session.role === "fan" ? (
          <section className="border-l-2 border-cyan bg-cyan/[0.04] p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
              {t.fanTitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t.fanText}</p>
            <LocaleLink
              href="/onboarding/role"
              className={`${actionLink} mt-4 border-cyan/50 hover:bg-cyan/10`}
            >
              {t.fanCta}
            </LocaleLink>
          </section>
        ) : null}

        {artist ? null : session.role === "artist" ? (
          <section className="border border-line bg-surface/40 p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold">{t.noArtistTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t.noArtistText}</p>
            <LocaleLink
              href="/onboarding/artist"
              className={`${actionLink} mt-4 border-violet/50 hover:bg-violet/10`}
            >
              {t.noArtistCta}
            </LocaleLink>
          </section>
        ) : null}

        {venue ? null : session.role === "venue" && !pendingRequest ? (
          <section className="border border-line bg-surface/40 p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold">{t.noVenueTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t.noVenueText}</p>
            <LocaleLink
              href="/onboarding/venue"
              className={`${actionLink} mt-4 border-cyan/50 hover:bg-cyan/10`}
            >
              {t.noVenueCta}
            </LocaleLink>
          </section>
        ) : null}
      </div>
    </div>
  );
}
