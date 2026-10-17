import Link from "@/components/i18n/LocaleLink";

import JsonLd from "@/components/seo/JsonLd";
import ShareEventButton from "@/components/events/ShareEventButton";
import SaveEventButton from "@/components/map/SaveEventButton";
import { formatEventDateLong, timeZoneName } from "@/lib/events/format";
import { artistPath, eventPath, venuePath } from "@/lib/events/paths";
import { listSavedEventIds } from "@/lib/events/queries";
import { artistRepeatsTitle, type PublicEvent } from "@/lib/events/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";
import { getSessionProfile } from "@/lib/supabase/session";

/**
 * Corpo della scheda evento.
 *
 * Vive in un componente (e non nella pagina) perché lo usano **due** rotte:
 * quella canonica `/eventi/<citta>/<slug>` e quella storica `/eventi/<id>`, che
 * reindirizza qui. Un solo posto da mantenere, nessuna pagina duplicata.
 */
export default async function EventPageView({ event }: { event: PublicEvent }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.events;

  const [session, savedIds] = await Promise.all([getSessionProfile(), listSavedEventIds()]);

  const hasPosition = event.latitude !== null && event.longitude !== null;
  const mapsUrl = hasPosition
    ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
    : null;

  const where = [event.venue?.name, event.city].filter(Boolean).join(" · ");
  const kindLabel = t.kinds[event.kind] ?? t.kinds.other;
  const canonicalPath = eventPath(event);

  const data = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.title,
    startDate: event.startsAt,
    url: absoluteUrl(`/${locale}${canonicalPath}`),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: event.coverImageUrl ?? undefined,
    description: event.description?.slice(0, 300) ?? undefined,
    isAccessibleForFree: event.isFree || undefined,
    performer: event.artist
      ? {
          "@type": "MusicGroup",
          name: event.artist.name,
          url: absoluteUrl(`/${locale}${artistPath(event.artist)}`),
        }
      : undefined,
    location: event.venue
      ? {
          "@type": "MusicVenue",
          name: event.venue.name,
          url: absoluteUrl(`/${locale}${venuePath(event.venue)}`),
          address: {
            "@type": "PostalAddress",
            streetAddress: event.venue.address ?? undefined,
            addressLocality: event.venue.city ?? undefined,
          },
          geo: hasPosition
            ? { "@type": "GeoCoordinates", latitude: event.latitude, longitude: event.longitude }
            : undefined,
        }
      : event.city
        ? { "@type": "Place", name: event.city }
        : undefined,
    offers: event.ticketUrl
      ? { "@type": "Offer", url: event.ticketUrl, availability: "https://schema.org/InStock" }
      : undefined,
  };

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <JsonLd data={data} />

      <Link href="/" className="text-sm text-muted transition-colors hover:text-white">
        ← {t.backToExplore}
      </Link>

      {event.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- locandine da URL esterni arbitrari
        <img
          src={event.coverImageUrl}
          alt=""
          decoding="async"
          referrerPolicy="no-referrer"
          className="mt-6 h-64 w-full rounded-3xl border border-white/10 object-cover sm:h-80"
        />
      ) : (
        <div
          className="mt-6 h-1.5 w-full rounded-full bg-gradient-to-r from-violet via-cyan to-pink"
          aria-hidden="true"
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 text-white">
          {kindLabel}
        </span>
        {event.genre ? (
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-muted">
            {event.genre}
          </span>
        ) : null}
        {event.isFree ? (
          <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-white">
            {t.freeEntry}
          </span>
        ) : null}
      </div>

      <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
        {event.title}
      </h1>

      {event.artist && !artistRepeatsTitle(event) ? (
        <p className="mt-3 text-lg text-white/80">
          <Link href={artistPath(event.artist)} className="transition-colors hover:text-white">
            {event.artist.name}
          </Link>
        </p>
      ) : null}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="glass rounded-2xl border border-white/10 p-5">
          <dt className="text-xs uppercase tracking-wide text-muted">{t.when}</dt>
          <dd className="mt-1 text-sm text-white">
            {formatEventDateLong(event.startsAt, event.timezone, locale)}
          </dd>
          <dd className="mt-1 text-xs text-muted">{timeZoneName(event.timezone, locale)}</dd>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5">
          <dt className="text-xs uppercase tracking-wide text-muted">{t.where}</dt>
          <dd className="mt-1 text-sm text-white">
            {event.venue ? (
              <Link href={venuePath(event.venue)} className="transition-colors hover:text-cyan">
                {event.venue.name}
              </Link>
            ) : (
              (event.city ?? "—")
            )}
            {event.venue && event.city ? ` · ${event.city}` : ""}
          </dd>
          {event.venue?.address ? (
            <dd className="mt-1 text-xs text-muted">{event.venue.address}</dd>
          ) : null}
          {mapsUrl || event.venue?.website ? (
            <dd className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan transition-opacity hover:opacity-80"
                >
                  {t.openInMaps}
                </a>
              ) : null}
              {event.venue?.website ? (
                <a
                  href={event.venue.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan transition-opacity hover:opacity-80"
                >
                  {t.venueWebsite}
                </a>
              ) : null}
            </dd>
          ) : null}
        </div>
      </dl>

      {event.description ? (
        <p className="mt-8 whitespace-pre-line text-sm leading-relaxed text-muted">
          {event.description}
        </p>
      ) : null}

      {event.locationPrecision === "approximate" ? (
        <p className="mt-6 rounded-2xl border border-cyan/30 bg-cyan/5 p-4 text-xs text-cyan">
          {t.approximateNote}
        </p>
      ) : null}

      {event.isUnclaimed ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-muted">
          {t.unclaimedNote}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {event.ticketUrl ? (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-gradient-to-r from-violet to-cyan px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t.tickets}
          </a>
        ) : null}

        <SaveEventButton
          eventId={event.id}
          nextPath={canonicalPath}
          initiallySaved={savedIds.has(event.id)}
          isAuthenticated={Boolean(session)}
          labels={{ save: t.save, saved: t.saved, loginToSave: t.loginToSave, pending: t.saving }}
          className="px-4 py-2.5 text-sm"
        />

        <ShareEventButton
          path={canonicalPath}
          title={event.title}
          text={where}
          labels={{ share: t.share, copied: t.shareCopied }}
        />
      </div>
    </article>
  );
}
