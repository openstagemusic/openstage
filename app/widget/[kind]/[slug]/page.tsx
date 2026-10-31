import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { absoluteUrl } from "@/lib/seo/site";
import { getArtistBySlug, getVenueBySlug } from "@/lib/directory/queries";
import { artistPath, eventPath, venuePath } from "@/lib/events/paths";
import { formatEventDate, formatEventRange } from "@/lib/events/format";
import { listUpcomingEventsByArtist, listUpcomingEventsByVenue } from "@/lib/events/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";

/**
 * Widget della programmazione.
 *
 * Una pagina nuda, pensata per essere messa in un `<iframe>` sul sito di un
 * locale o di un artista: nessuna navbar, nessun footer, nessun player. Resta
 * il linguaggio del sito, ma in formato manifesto: nome, prossime serate, link.
 *
 * `noindex`: il contenuto vive già sulla scheda pubblica, questa è una copia
 * per l'incorporamento e non deve competere con l'originale.
 */

type WidgetProps = {
  params: Promise<{ kind: string; slug: string }>;
};

export async function generateMetadata({ params }: WidgetProps): Promise<Metadata> {
  const { kind, slug } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const page =
    kind === "artist"
      ? await getArtistBySlug(slug)
      : kind === "venue"
        ? await getVenueBySlug(slug)
        : null;

  return {
    title: page ? `${page.name} — ${dict.widget.eyebrow}` : dict.widget.eyebrow,
    robots: { index: false, follow: false },
  };
}

export default async function WidgetPage({ params }: WidgetProps) {
  const { kind, slug } = await params;

  if (kind !== "artist" && kind !== "venue") notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.widget;

  const page = kind === "artist" ? await getArtistBySlug(slug) : await getVenueBySlug(slug);

  if (!page) notFound();

  const events =
    kind === "artist"
      ? await listUpcomingEventsByArtist(page.id, 6)
      : await listUpcomingEventsByVenue(page.id, 6);

  const profileHref = absoluteUrl(
    withLocale(locale, kind === "artist" ? artistPath(page) : venuePath(page))
  );

  return (
    <div className="min-h-dvh bg-bg px-4 py-4 text-foreground">
      <header className="flex items-center justify-between gap-3 border-b border-line pb-2">
        <span className="font-poster text-sm uppercase leading-none tracking-[0.02em]">
          Open<span className="text-cyan">/</span>Stage
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
          {kind === "artist" ? t.artist : t.venue}
        </span>
      </header>

      <h1 className="mt-4 font-poster text-3xl uppercase leading-[0.92] tracking-[-0.01em]">
        {page.name}
      </h1>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        {[page.city, t.program].filter(Boolean).join(" · ")}
      </p>

      {events.length > 0 ? (
        <ul className="mt-4 border-t border-line">
          {events.map((event) => {
            const when = formatEventDate(event.startsAt, event.timezone, locale);
            const range = formatEventRange(event, locale);

            return (
              <li key={event.id} className="border-b border-line py-3">
                <a
                  href={absoluteUrl(withLocale(locale, eventPath(event)))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-cyan">
                    {when.isToday ? `${t.tonight} · ${when.time}` : range}
                  </span>
                  <span className="mt-1 block font-display text-sm font-semibold leading-tight transition-colors group-hover:text-cyan">
                    {event.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {[event.city, event.isFree ? t.free : event.priceText].filter(Boolean).join(" · ")}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 border-t border-line pt-4 text-sm text-muted">{t.empty}</p>
      )}

      <a
        href={profileHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 border-b border-line-strong pb-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
      >
        {t.open} <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
