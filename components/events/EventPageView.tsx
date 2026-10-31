import Link from "@/components/i18n/LocaleLink";

import JsonLd from "@/components/seo/JsonLd";
import AddToCalendar from "@/components/events/AddToCalendar";
import EventCountdown from "@/components/events/EventCountdown";
import EventCover from "@/components/events/EventCover";
import ReportEventButton from "@/components/events/ReportEventButton";
import ShareEventPanel from "@/components/events/ShareEventPanel";
import SaveEventButton from "@/components/map/SaveEventButton";
import { cityPath } from "@/lib/cities/paths";
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
      !cancelled && !event.isFree && event.ticketUrl
        ? { "@type": "Offer", url: event.ticketUrl, availability: "https://schema.org/InStock" }
        : undefined,
  };

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
      <JsonLd data={data} />

      <Link
        href="/"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {t.backToExplore}
      </Link>

      {/* La notizia prima della locandina: chi apre il link deve sapere subito
          che la serata non si tiene, senza leggere il poster per intero. */}
      {cancelled ? (
        <section className="mt-6 os-note os-note-pink">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-pink">
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
            ? "mt-8 grid gap-8 md:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] md:items-start"
            : "mt-8"
        }
      >
        {event.coverImageUrl ? (
          // La locandina si vede **intera**, nella sua forma di poster: il resto
          // del riquadro lo riempie la stessa foto sfocata.
          <EventCover
            src={event.coverImageUrl}
            className="aspect-[4/5] w-full border border-line bg-surface"
          />
        ) : null}

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-violet">
              {kindLabel}
            </span>
            {event.genre ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {event.genre}
              </span>
            ) : null}
            {priceLabel ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
                {priceLabel}
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 text-balance font-poster text-[clamp(2.6rem,7vw,4.8rem)] uppercase leading-[0.92] tracking-[-0.02em]">
            {event.title}
          </h1>

          {event.artist && !artistRepeatsTitle(event) ? (
            <p className="mt-3 text-lg text-white/80">
              <Link href={artistPath(event.artist)} className="transition-colors hover:text-cyan">
                {event.artist.name}
              </Link>
            </p>
          ) : null}

          {cancelled ? null : (
            <EventCountdown
              startsAt={event.startsAt}
              className="mt-5"
              labels={{
                in: t.countdownIn,
                days: t.countdownDays,
                hours: t.countdownHours,
                minutes: t.countdownMinutes,
                soon: t.countdownSoon,
              }}
            />
          )}

          <dl className="mt-8 border-t border-line">
        <div className="grid gap-2 border-b border-line py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
            {t.when}
          </dt>
          <dd className="text-sm text-white">
            <span className="block">
              {formatEventDateLong(event.startsAt, event.timezone, locale)}
            </span>
            <span className="mt-1 block text-xs text-muted">
              {timeZoneName(event.timezone, locale)}
            </span>
          </dd>
        </div>

        <div className="grid gap-2 border-b border-line py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
            {t.where}
          </dt>
          <dd className="text-sm text-white">
            <span className="block">
              {event.venue ? (
                <Link href={venuePath(event.venue)} className="transition-colors hover:text-cyan">
                  {event.venue.name}
                </Link>
              ) : event.city ? (
                <Link href={cityPath(event.city)} className="transition-colors hover:text-cyan">
                  {event.city}
                </Link>
              ) : (
                "—"
              )}
              {event.venue && event.city ? (
                <>
                  {" · "}
                  <Link href={cityPath(event.city)} className="transition-colors hover:text-cyan">
                    {event.city}
                  </Link>
                </>
              ) : null}
            </span>
            {event.venue?.address ? (
              <span className="mt-1 block text-xs text-muted">{event.venue.address}</span>
            ) : null}
            {event.directionsText ? (
              <span className="mt-4 block border-t border-line pt-4">
                <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  {t.howToGetThere}
                </span>
                <span className="mt-1 block whitespace-pre-line text-sm text-white/90">
                  {event.directionsText}
                </span>
              </span>
            ) : null}
            {mapsUrl || event.venue?.website ? (
              <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan transition-opacity hover:opacity-80"
                  >
                    {t.openInMaps}
                  </a>
                ) : null}
                {event.venue?.website ? (
                  <a
                    href={event.venue.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan transition-opacity hover:opacity-80"
                  >
                    {t.venueWebsite}
                  </a>
                ) : null}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>
        </div>
      </header>

      {event.description ? (
        <p className="mt-8 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted">
          {event.description}
        </p>
      ) : null}

      {event.locationPrecision === "approximate" ? (
        <p className="mt-6 os-note os-note-cyan">
          {t.approximateNote}
        </p>
      ) : null}

      {event.isUnclaimed ? (
        <p className="mt-4 os-note">
          {t.unclaimedNote}
        </p>
      ) : null}

      <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:flex-wrap sm:items-center">
        {!cancelled && !event.isFree && event.ticketUrl ? (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-violet-strong px-5 py-3 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan sm:w-auto"
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
            className="justify-center px-0 font-mono text-[11px] sm:w-auto"
          />
        )}

        {cancelled ? null : (
          <AddToCalendar
            googleUrl={googleCalendarUrl(event, pageUrl, { free: t.freeEntry })}
            icsUrl={`/api/events/${event.id}/ical`}
            labels={{ add: t.addToCalendar, google: t.googleCalendar, apple: t.appleCalendar }}
            className="w-full justify-center sm:w-auto"
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
          className="w-full justify-center sm:w-auto"
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
