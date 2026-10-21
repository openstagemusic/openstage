import type { Metadata } from "next";
import Link from "@/components/i18n/LocaleLink";
import { notFound } from "next/navigation";

import EventTeaser from "@/components/events/EventTeaser";
import JsonLd from "@/components/seo/JsonLd";
import ClaimPanel, { type ClaimState } from "@/components/claims/ClaimPanel";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import { canManageVenueProfile } from "@/lib/auth/roles";
import { getMyPendingRequest, getReplaceablePage } from "@/lib/claims/queries";
import { getVenueByProfileId, getVenueBySlug } from "@/lib/directory/queries";
import { venuePath } from "@/lib/events/paths";
import { listPastEventsByVenue, listUpcomingEventsByVenue } from "@/lib/events/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";
import { getSessionProfile } from "@/lib/supabase/session";

type VenuePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: VenuePageProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);

  if (!venue) return {};

  const description = [venue.name, venue.address, venue.city].filter(Boolean).join(" · ");

  return {
    title: venue.name,
    description,
    openGraph: { title: venue.name, description, type: "website" },
  };
}

/**
 * Scheda pubblica del locale: indirizzo, capienza dichiarata (se c'è) e i
 * concerti in programma. Nessun dato di riempimento: quello che non sappiamo
 * non si scrive.
 */
export default async function VenuePage({ params }: VenuePageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const venue = await getVenueBySlug(slug);

  if (!venue) notFound();

  const dict = getDictionary(locale);
  const t = dict.directory;
  const session = await getSessionProfile();
  const [events, past] = await Promise.all([
    listUpcomingEventsByVenue(venue.id),
    listPastEventsByVenue(venue.id),
  ]);

  // La scheda di un locale si prende su richiesta. Il database permette una
  // sola richiesta in attesa per profilo (0014): se è per questa scheda lo
  // diciamo; se è per un'altra, non si offre un pulsante che fallirebbe.
  // Come per gli artisti, chi ha il ruolo sbagliato o amministra già un locale
  // con eventi riceve una spiegazione; chi ha una scheda senza eventi può
  // chiedere questa, e la sua viene eliminata all'approvazione (lo fa il database).
  const myRequest =
    !venue.claimed && session !== null ? await getMyPendingRequest() : null;
  const pending = myRequest !== null && myRequest.subjectId === venue.id;
  const pendingElsewhere = myRequest !== null && myRequest.subjectId !== venue.id;

  const canManage = session !== null && canManageVenueProfile(session.role);

  const replace =
    !venue.claimed && canManage && session
      ? await getReplaceablePage("venue", session.id, venue.id)
      : null;

  const ownsAnother =
    !venue.claimed && canManage && session && replace === null
      ? (await getVenueByProfileId(session.id)) !== null
      : false;

  const claimState: ClaimState = !venue.claimed
    ? pending
      ? "pending"
      : session === null
        ? "unclaimed"
        : !canManage
          ? "wrongRole"
          : pendingElsewhere
            ? "pendingElsewhere"
            : ownsAnother
              ? "owned"
              : "unclaimed"
    : venue.profileId === session?.id
      ? "mine"
      : "claimed";

  const hasPosition = venue.latitude !== null && venue.longitude !== null;
  const mapsUrl = hasPosition
    ? `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`
    : null;

  const data = {
    "@context": "https://schema.org",
    "@type": "MusicVenue",
    name: venue.name,
    url: absoluteUrl(`/${locale}${venuePath(venue)}`),
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address ?? undefined,
      addressLocality: venue.city ?? undefined,
    },
    maximumAttendeeCapacity: venue.capacity ?? undefined,
    geo: hasPosition
      ? { "@type": "GeoCoordinates", latitude: venue.latitude, longitude: venue.longitude }
      : undefined,
    sameAs: venue.website ? [venue.website] : undefined,
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <JsonLd data={data} />

      <Link href="/locali" className="text-sm text-muted transition-colors hover:text-white">
        ← {t.backToVenues}
      </Link>

      <div
        className="mt-6 h-px w-full bg-gradient-to-r from-violet/70 via-cyan/40 to-transparent"
        aria-hidden="true"
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
        {venue.city ? (
          <span className="rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 text-white">
            {venue.city}
          </span>
        ) : null}
        {venue.capacity ? (
          <span className="rounded-full border border-line px-2.5 py-1 text-muted">
            {t.capacity}: {venue.capacity} {t.capacityPeople}
          </span>
        ) : null}
        {venue.verified ? (
          <VerifiedBadge dict={t} />
        ) : venue.claimed ? null : (
          <span className="rounded-full border border-line px-2.5 py-1 text-muted">
            {t.badgeUnclaimed}
          </span>
        )}
      </div>

      <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">
        {venue.name}
      </h1>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="glass rounded-2xl border border-line p-5">
          <dt className="text-xs uppercase tracking-wide text-muted">{t.address}</dt>
          <dd className="mt-1 text-sm text-white">
            {[venue.address, venue.city].filter(Boolean).join(" · ") || "—"}
          </dd>
          {mapsUrl ? (
            <dd className="mt-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan transition-opacity hover:opacity-80"
              >
                {dict.events.openInMaps}
              </a>
            </dd>
          ) : null}
        </div>

        {venue.website ? (
          <div className="glass rounded-2xl border border-line p-5">
            <dt className="text-xs uppercase tracking-wide text-muted">{t.website}</dt>
            <dd className="mt-1">
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cyan transition-opacity hover:opacity-80"
              >
                {venue.website}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      <ClaimPanel
        subjectType="venue"
        subjectId={venue.id}
        state={claimState}
        isAuthenticated={session !== null}
        canUpgradeRole={session?.role === "fan"}
        replaceName={replace?.name ?? null}
        dict={dict.claims}
      />

      <h2 className="mt-12 font-display text-xl font-semibold">{t.upcomingTitle}</h2>

      {events.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventTeaser key={event.id} event={event} locale={locale} dict={dict} />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted">{t.upcomingEmpty}</p>
      )}

      {past.length > 0 ? (
        <>
          <h2 className="mt-12 font-display text-xl font-semibold">{t.pastTitle}</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <EventTeaser key={event.id} event={event} locale={locale} dict={dict} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
