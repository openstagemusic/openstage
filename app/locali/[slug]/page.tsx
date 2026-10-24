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

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

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

      <Link
        href="/locali"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {t.backToVenues}
      </Link>

      <header className="mt-8 grid gap-6 border-t border-line pt-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
        <span
          aria-hidden="true"
          className="flex h-32 w-32 items-center justify-center border border-cyan/30 bg-cyan/10 font-poster text-6xl leading-none text-cyan"
        >
          {initials(venue.name)}
        </span>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {venue.city ? (
              <span className="border border-violet/40 bg-violet/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                {venue.city}
              </span>
            ) : null}
            {venue.capacity ? (
              <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {t.capacity}: {venue.capacity} {t.capacityPeople}
              </span>
            ) : null}
            {venue.verified ? (
              <VerifiedBadge dict={t} />
            ) : venue.claimed ? null : (
              <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {t.badgeUnclaimed}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-balance font-poster text-4xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-6xl">
            {venue.name}
          </h1>
        </div>
      </header>

      <dl className="mt-8 border-t border-line">
        <div className="grid gap-2 border-b border-line py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
            {t.address}
          </dt>
          <dd className="text-sm text-white">
            <span className="block">{[venue.address, venue.city].filter(Boolean).join(" · ") || "—"}</span>
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.12em] text-cyan transition-opacity hover:opacity-80"
              >
                {dict.events.openInMaps}
              </a>
            ) : null}
          </dd>
        </div>

        {venue.website ? (
          <div className="grid gap-2 border-b border-line py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
              {t.website}
            </dt>
            <dd>
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

      <h2 className="mt-12 font-display text-2xl font-semibold">{t.upcomingTitle}</h2>

      {events.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventTeaser key={event.id} event={event} locale={locale} dict={dict} />
          ))}
        </div>
      ) : (
        <p className="mt-5 border-l-2 border-line-strong pl-3 text-sm text-muted">{t.upcomingEmpty}</p>
      )}

      {past.length > 0 ? (
        <>
          <h2 className="mt-12 font-display text-2xl font-semibold">{t.pastTitle}</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <EventTeaser key={event.id} event={event} locale={locale} dict={dict} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
