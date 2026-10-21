"use client";

import EventCover from "@/components/events/EventCover";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { editorInstant, type EventEditorState } from "@/lib/events/editor";
import { formatEventDate } from "@/lib/events/format";
import type { Locale } from "@/lib/i18n/config";

type EventPreviewCardProps = {
  values: EventEditorState;
  locale: Locale;
  dict: Dictionary;
};

/**
 * L'anteprima dal vivo della scheda.
 *
 * Mostra quello che si sta scrivendo, con la stessa lingua visiva degli elenchi
 * pubblici: quando il modulo è vuoto dice cosa manca invece di mostrare una
 * scheda vuota.
 */
export default function EventPreviewCard({ values, locale, dict }: EventPreviewCardProps) {
  const t = dict.editor;
  const instant = editorInstant(values);
  const when = instant ? formatEventDate(instant, values.timezone, locale) : null;

  const place = [
    values.venueId ? null : values.venueName.trim(),
    values.city.trim(),
  ]
    .filter(Boolean)
    .join(" · ");

  const kindLabel = dict.events.kinds[values.kind] ?? dict.events.kinds.other;
  const price = values.isFree ? dict.events.freeEntry : values.priceText.trim();

  return (
    <div className="glass overflow-hidden rounded-3xl border border-white/10">
      {values.coverImageUrl ? (
        <EventCover src={values.coverImageUrl} className="aspect-square w-full" />
      ) : (
        <div
          className="h-px w-full bg-gradient-to-r from-violet/70 via-cyan/40 to-transparent"
          aria-hidden="true"
        />
      )}

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 text-white">
            {kindLabel}
          </span>
          {values.genre.trim() ? (
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-muted">
              {values.genre.trim()}
            </span>
          ) : null}
          {price ? (
            <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-white">
              {price}
            </span>
          ) : null}
        </div>

        <h3 className="mt-4 font-display text-xl font-semibold leading-tight">
          {values.title.trim() || t.previewEmptyTitle}
        </h3>

        <p className="mt-2 text-sm text-white/80">{when ? when.full : t.previewEmptyWhen}</p>
        <p className="mt-1 text-sm text-muted">{place || t.previewEmptyWhere}</p>

        {values.description.trim() ? (
          <p className="mt-3 line-clamp-4 text-sm text-muted">{values.description.trim()}</p>
        ) : null}
      </div>
    </div>
  );
}
