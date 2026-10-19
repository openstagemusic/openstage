"use client";

import Link from "@/components/i18n/LocaleLink";
import { useState } from "react";

import EventCover from "@/components/events/EventCover";
import SaveEventButton from "@/components/map/SaveEventButton";
import { formatEventDate } from "@/lib/events/format";
import { eventPath } from "@/lib/events/paths";
import { artistRepeatsTitle, placeName, type PublicEvent } from "@/lib/events/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type EventCardProps = {
  event: PublicEvent;
  locale: Locale;
  /** `popup`: scheda compatta nel pop-up ancorato al pin. `sheet`: bottom sheet mobile. */
  variant?: "popup" | "sheet";
  initiallySaved?: boolean;
  isAuthenticated?: boolean;
  onClose?: () => void;
};

const secondaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-white/30 hover:text-white";

/**
 * Scheda di un evento con tutte le azioni del pop-up: pagina evento, biglietti,
 * Google Maps, salva e condividi. Usata sia nel pop-up (desktop, compatta) sia
 * nel bottom sheet (mobile, con la locandina grande).
 */
export default function EventCard({
  event,
  locale,
  variant = "popup",
  initiallySaved = false,
  isAuthenticated = false,
  onClose,
}: EventCardProps) {
  const dict = getDictionary(locale);
  const t = dict.events;
  const when = formatEventDate(event.startsAt, event.timezone, locale);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  const hasPosition = event.latitude !== null && event.longitude !== null;
  const mapsUrl = hasPosition
    ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
    : null;

  const where = [placeName(event), event.city].filter(Boolean).join(" · ");
  const kindLabel = t.kinds[event.kind] ?? t.kinds.other;
  const whenLabel = when.isToday ? t.tonight : when.isTomorrow ? t.tomorrow : null;
  const isSheet = variant === "sheet";

  const share = async () => {
    const path = eventPath(event);
    const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: event.title, text: where, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2200);
    } catch {
      // Condivisione annullata dall'utente: nessun errore da mostrare.
    }
  };

  return (
    <article
      className={cn(
        "glass w-full overflow-hidden border border-white/10 text-left",
        isSheet ? "rounded-3xl" : "rounded-2xl"
      )}
    >
      {isSheet ? (
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted"
            >
              {dict.map.close}
            </button>
          ) : null}
        </div>
      ) : null}

      {isSheet && event.coverImageUrl ? (
        <EventCover src={event.coverImageUrl} className="mt-3 aspect-[4/3] w-full" />
      ) : (
        <div className="h-1 w-full bg-gradient-to-r from-violet via-cyan to-pink" aria-hidden="true" />
      )}

      <div className="p-4">
        <div className="flex gap-3">
          {!isSheet && event.coverImageUrl ? (
            <EventCover
              src={event.coverImageUrl}
              className="h-14 w-14 shrink-0 rounded-xl border border-white/10"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-full border border-violet/40 bg-violet/10 px-2 py-0.5 text-white">
                {kindLabel}
              </span>
              {whenLabel ? (
                <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-white">
                  {whenLabel}
                </span>
              ) : null}
              {event.isFree || event.priceText ? (
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-muted">
                  {event.isFree ? t.freeEntry : event.priceText}
                </span>
              ) : null}
              {event.genre ? (
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-muted">
                  {event.genre}
                </span>
              ) : null}
            </div>

            <h3 className="mt-2 font-display text-base font-semibold leading-tight">
              {event.title}
            </h3>

            {event.artist && !artistRepeatsTitle(event) ? (
              <p className="mt-0.5 text-sm text-white/80">{event.artist.name}</p>
            ) : null}
          </div>
        </div>

        <p className="mt-2 text-sm text-muted">
          <span className="text-white/80">{when.full}</span>
          {where ? ` · ${where}` : ""}
        </p>

        {event.locationPrecision === "approximate" ? (
          <p className="mt-1.5 text-xs text-cyan">{t.approximateNote}</p>
        ) : null}

        {event.isUnclaimed ? (
          <p className="mt-1.5 text-xs text-muted">{t.unclaimedNote}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={eventPath(event)}
            className="rounded-full bg-gradient-to-r from-violet to-cyan px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            {t.eventPage}
          </Link>

          {event.ticketUrl ? (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(secondaryButtonClass, "text-white")}
            >
              {t.tickets}
            </a>
          ) : null}

          <SaveEventButton
            eventId={event.id}
            initiallySaved={initiallySaved}
            isAuthenticated={isAuthenticated}
            labels={{ save: t.save, saved: t.saved, loginToSave: t.loginToSave, pending: t.saving }}
          />

          <button type="button" onClick={share} className={secondaryButtonClass}>
            {shareState === "copied" ? t.shareCopied : t.share}
          </button>

          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryButtonClass}
            >
              {t.openInMaps}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
