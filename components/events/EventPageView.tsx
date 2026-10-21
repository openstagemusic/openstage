import Link from "@/components/i18n/LocaleLink";

import JsonLd from "@/components/seo/JsonLd";
import AddToCalendar from "@/components/events/AddToCalendar";
import EventCountdown from "@/components/events/EventCountdown";
import EventCover from "@/components/events/EventCover";
import ReportEventButton from "@/components/events/ReportEventButton";
import ShareEventPanel from "@/components/events/ShareEventPanel";
import SaveEventButton from "@/components/map/SaveEventButton";
import { googleCalendarUrl } from "@/lib/events/calendar";
import { formatEventDate, formatEventDateLong, timeZoneName } from "@/lib/events/format";
import { artistPath, eventPath, venuePath } from "@/lib/events/paths";
import { listSavedEventIds } from "@/lib/events/queries";
import { artistRepeatsTitle, isCancelled, placeName, type PublicEvent } from "@/lib/events/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
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

  // Una serata annullata resta raggiungibile: chi ha il link (o l'aveva salvata)
  // deve trovare la notizia, non una pagina che non esiste più.
  const cancelled = isCancelled(event);

  const hasPosition = event.latitude !== null && event.longitude !== null;
  const place = placeName(event);
  const where = [place, event.city].filter(Boolean).join(" · ");

  // Su una posizione approssimativa il pin non esiste: portare a un punto
  // preciso sarebbe una bugia. Si cerca il locale e la città, e chi va decide
  // l'ultimo tratto.
  const mapsQuery =
    event.locationPrecision === "approximate"
      ? [place, event.city].filter(Boolean).join(", ")
      : hasPosition
        ? `${event.latitude},${event.longitude}`
        : "";

  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null;

  const kindLabel = t.kinds[event.kind] ?? t.kinds.other;
  const canonicalPath = eventPath(event);
  const localizedPath = withLocale(locale, canonicalPath);
  const pageUrl = absoluteUrl(localizedPath);

  // Niente biglietti, niente calendario e niente "Salva" su una serata annullata:
  // si può solo leggerla e condividerla come annuncio.
  const priceLabel = event.isFree ? t.freeEntry : event.priceText;
  const shortWhen = formatEventDate(event.startsAt, event.timezone, locale).full;

  const data = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.title,
    startDate: event.startsAt,
    url: pageUrl,
    eventStatus: cancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: event.coverImageUrl ?? undefined,
    description: event.description?.slice(0, 300) ?? undefined,
    isAccessibleForFree: event.isFree || undefined,
    performer: event.artist
      ? {
          "@type": "MusicGroup",
          name: event.artist.name,
          url: absoluteUrl(withLocale(locale, artistPath(event.artist))),
        }
      : undefined,
    location: event.venue
      ? {
          "@type": "MusicVenue",
          name: event.venue.name,
          url: absoluteUrl(withLocale(locale, venuePath(event.venue))),
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
    offers:
      !cancelled && event.ticketUrl
        ? { "@type": "Offer", url: event.ticketUrl, availability: "https://schema.org/InStock" }
        : undefined,
  };

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <JsonLd data={data} />

      <Link href="/" className="text-sm text-muted transition-colors hover:text-white">
        ← {t.backToExplore}
      </Link>

      {/* La notizia prima della locandina: chi apre il link deve sapere subito
          che la serata non si tiene, senza leggere il poster per intero. */}
      {cancelled ? (
        <section className="mt-6 rounded-2xl border border-pink/40 bg-pink/10 p-5">
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-white">
            {t.cancelledBadge}
          </p>
          <p className="mt-2 text-sm text-white/90">{t.cancelledText}</p>
          {event.cancelledAt ? (
            <p className="mt-1 text-xs text-muted">
              {t.cancelledOn} {formatEventDateLong(event.cancelledAt, event.timezone, locale)}
            </p>
          ) : null}
          {event.cancelReason ? (
            <p className="mt-2 text-sm text-white/80">{event.cancelReason}</p>
          ) : null}
        </section>
      ) : null}

      <header
        className={
          event.coverImageUrl
            ? "mt-6 grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start"
            : "mt-6"
        }
      >
        {event.coverImageUrl ? (
          // La locandina si vede **intera**, nella sua forma di poster: il resto
          // del riquadro lo riempie la stessa foto sfocata.
          <EventCover
            src={event.coverImageUrl}
            className="aspect-[4/5] w-full rounded-card border border-line"
          />
        ) : null}

        <div>
          {event.coverImageUrl ? null : (
            <div
              className="mb-6 h-px w-full bg-gradient-to-r from-violet/70 via-cyan/40 to-transparent"
              aria-hidden="true"
            />
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 text-white">
              {kindLabel}
            </span>
            {event.genre ? (
              <span className="rounded-full border border-line px-2.5 py-1 text-muted">
                {event.genre}
              </span>
            ) : null}
            {priceLabel ? (
              <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-white">
                {priceLabel}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">
            {event.title}
          </h1>

          {event.artist && !artistRepeatsTitle(event) ? (
            <p className="mt-3 text-lg text-white/80">
              <Link href={artistPath(event.artist)} className="transition-colors hover:text-white">
                {event.artist.name}
              </Link>
            </p>
          ) : null}

          {cancelled ? null : (
            <EventCountdown
              startsAt={event.startsAt}
              className="mt-4"
              labels={{
                in: t.countdownIn,
                days: t.countdownDays,
                hours: t.countdownHours,
                minutes: t.countdownMinutes,
                soon: t.countdownSoon,
              }}
            />
          )}
        </div>
      </header>

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
          {event.directionsText ? (
            <dd className="mt-3 border-t border-white/10 pt-3">
              <span className="block text-xs uppercase tracking-wide text-muted">
                {t.howToGetThere}
              </span>
              <span className="mt-1 block whitespace-pre-line text-sm text-white/90">
                {event.directionsText}
              </span>
            </dd>
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
        {!cancelled && event.ticketUrl ? (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-violet-strong px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t.tickets}
          </a>
        ) : null}

        {/* Niente «Salva» su una serata che non si tiene: nei Preferiti resta
            quello che era già salvato, ma non se ne aggiungono di nuovi. */}
        {cancelled ? null : (
          <SaveEventButton
            eventId={event.id}
            nextPath={canonicalPath}
            initiallySaved={savedIds.has(event.id)}
            isAuthenticated={Boolean(session)}
            labels={{ save: t.save, saved: t.saved, loginToSave: t.loginToSave, pending: t.saving }}
            className="px-4 py-2.5 text-sm"
          />
        )}

        {cancelled ? null : (
          <AddToCalendar
            googleUrl={googleCalendarUrl(event, pageUrl, { free: t.freeEntry })}
            icsUrl={`/api/events/${event.id}/ical`}
            labels={{ add: t.addToCalendar, google: t.googleCalendar, apple: t.appleCalendar }}
          />
        )}

        <ShareEventPanel
          path={localizedPath}
          slug={event.slug || event.id}
          title={event.title}
          when={shortWhen}
          where={where}
          kind={kindLabel}
          price={cancelled ? null : priceLabel}
          photoUrl={event.coverImageUrl}
          cancelled={cancelled}
          labels={{
            share: t.share,
            title: t.shareTitle,
            story: t.shareStory,
            square: t.shareSquare,
            download: t.shareDownload,
            native: t.shareNative,
            copy: t.shareCopyLink,
            copied: t.shareCopied,
            generating: t.shareGenerating,
            failed: t.shareCardFailed,
            hint: t.shareCardHint,
            cancelledBadge: t.cancelledBadge,
            cancelledNote: t.shareCancelledNote,
            close: t.shareClose,
          }}
        />

        {/* Segnalare serve su una serata che si tiene: su una annullata non c'è
            niente da moderare. Serve una sessione, perché una segnalazione
            anonima non si può né verificare né fermare. */}
        {session && !cancelled ? (
          <ReportEventButton
            eventId={event.id}
            labels={{
              open: t.reportOpen,
              title: t.reportTitle,
              hint: t.reportHint,
              reason: t.reportReason,
              reasons: t.reportReasons,
              note: t.reportNote,
              notePlaceholder: t.reportNotePlaceholder,
              send: t.reportSend,
              sending: t.reportSending,
              done: t.reportDone,
              close: t.reportClose,
              already: t.reportAlready,
              own: t.reportOwn,
              failed: t.reportFailed,
            }}
          />
        ) : null}
      </div>
    </article>
  );
}
