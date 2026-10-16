import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ShareEventButton from "@/components/events/ShareEventButton";
import SaveEventButton from "@/components/map/SaveEventButton";
import { formatEventDateLong, timeZoneName } from "@/lib/events/format";
import { artistRepeatsTitle } from "@/lib/events/types";
import { getEventById, listSavedEventIds } from "@/lib/events/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

type EventPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    return { title: "Event" };
  }

  const description =
    event.description?.slice(0, 160) ??
    [event.artist?.name, event.venue?.name, event.city].filter(Boolean).join(" · ");

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      images: event.coverImageUrl ? [event.coverImageUrl] : undefined,
    },
  };
}

/**
 * Pagina pubblica dell'evento: renderizzata dal server, con dati reali e i
 * pulsanti "Salva" e "Condividi" funzionanti (nessun link morto).
 */
export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.events;

  const event = await getEventById(id);
  if (!event) notFound();

  const [session, savedIds] = await Promise.all([getSessionProfile(), listSavedEventIds()]);

  const hasPosition = event.latitude !== null && event.longitude !== null;
  const mapsUrl = hasPosition
    ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
    : null;

  const where = [event.venue?.name, event.city].filter(Boolean).join(" · ");
  const kindLabel = t.kinds[event.kind] ?? t.kinds.other;

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
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
        <p className="mt-3 text-lg text-white/80">{event.artist.name}</p>
      ) : null}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="glass rounded-2xl border border-white/10 p-5">
          <dt className="text-xs uppercase tracking-wide text-muted">{t.when}</dt>
          <dd className="mt-1 text-sm text-white">
            {formatEventDateLong(event.startsAt, event.timezone, locale)}
          </dd>
          <dd className="mt-1 text-xs text-muted">
            {timeZoneName(event.timezone, locale)}
          </dd>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5">
          <dt className="text-xs uppercase tracking-wide text-muted">{t.where}</dt>
          <dd className="mt-1 text-sm text-white">{where || "—"}</dd>
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
          initiallySaved={savedIds.has(event.id)}
          isAuthenticated={Boolean(session)}
          labels={{ save: t.save, saved: t.saved, loginToSave: t.loginToSave, pending: t.saving }}
          className="px-4 py-2.5 text-sm"
        />

        <ShareEventButton
          path={`/eventi/${event.id}`}
          title={event.title}
          text={where}
          labels={{ share: t.share, copied: t.shareCopied }}
        />
      </div>
    </article>
  );
}
