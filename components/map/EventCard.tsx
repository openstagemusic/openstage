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
  "inline-flex min-h-11 items-center justify-center gap-1.5 border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white";

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center border border-violet-strong bg-violet-strong px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet";

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
        "w-full overflow-hidden border border-line-strong bg-surface/95 text-left backdrop-blur",
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
              className="min-h-11 border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
            >
              {dict.map.close}
            </button>
          ) : null}
        </div>
      ) : null}

      {isSheet && event.coverImageUrl ? (
        <EventCover src={event.coverImageUrl} className="mt-3 aspect-[4/3] w-full border-y border-line" />
      ) : null}

      <div className="p-4">
        <div className="flex gap-3">
          {!isSheet && event.coverImageUrl ? (
            <EventCover
              src={event.coverImageUrl}
              className="h-16 w-16 shrink-0 border border-line"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="border border-violet/40 bg-violet/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                {kindLabel}
              </span>
              {whenLabel ? (
                <span className="border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                  {whenLabel}
                </span>
              ) : null}
              {event.isFree || event.priceText ? (
                <span className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  {event.isFree ? t.freeEntry : event.priceText}
                </span>
              ) : null}
              {event.genre ? (
                <span className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  {event.genre}
                </span>
              ) : null}
            </div>

            <h3 className="mt-2 font-display text-lg font-semibold leading-tight">
              {event.title}
            </h3>

            {event.artist && !artistRepeatsTitle(event) ? (
              <p className="mt-0.5 text-sm text-white/80">{event.artist.name}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid gap-1 border-t border-line pt-3 text-sm">
          <p className="text-white/85">
            <span className="mr-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan">
              {t.when}
            </span>
            {when.full}
          </p>
          {where ? (
            <p className="text-muted">
              <span className="mr-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan">
                {t.where}
              </span>
              {where}
            </p>
          ) : null}
        </div>

        {event.locationPrecision === "approximate" ? (
          <p className="mt-2 border-l-2 border-cyan/50 pl-2 text-xs text-cyan">
            {t.approximateNote}
          </p>
        ) : null}

        {event.isUnclaimed ? (
          <p className="mt-2 border-l-2 border-line-strong pl-2 text-xs text-muted">
            {t.unclaimedNote}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href={eventPath(event)} className={primaryButtonClass}>
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
