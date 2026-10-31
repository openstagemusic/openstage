import type { Metadata } from "next";
import { notFound } from "next/navigation";

import EventTeaser from "@/components/events/EventTeaser";
import LocaleLink from "@/components/i18n/LocaleLink";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import { getVenueBySlug } from "@/lib/directory/queries";
import { listPastEventsByVenue } from "@/lib/events/queries";
import { venuePath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";

type ArchiveProps = {
  params: Promise<{ slug: string }>;
};

/** Archivio delle serate passate di un locale: la scheda ne mostra solo sei. */
export async function generateMetadata({ params }: ArchiveProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const venue = await getVenueBySlug(slug);

  if (!venue) return { title: dict.directory.pastTitle };

  return {
    title: `${venue.name} — ${dict.directory.pastTitle}`,
    robots: { index: false, follow: true },
    alternates: { canonical: absoluteUrl(withLocale(locale, venuePath(venue))) },
  };
}

export default async function VenueArchivePage({ params }: ArchiveProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.directory;

  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();

  const past = await listPastEventsByVenue(venue.id, 60);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <LocaleLink
        href={venuePath(venue)}
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {venue.name}
      </LocaleLink>

      <header className="mt-8 border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
          {t.pastTitle}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-poster text-4xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-6xl">
            {venue.name}
          </h1>
          {venue.verified ? <VerifiedBadge label={t.badgeVerified} /> : null}
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          {[venue.city, `${past.length} ${dict.dashboard.statusPast.toLowerCase()}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {past.length > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {past.map((event) => (
            <EventTeaser key={event.id} event={event} locale={locale} dict={dict} />
          ))}
        </div>
      ) : (
        <p className="mt-8 border-l-2 border-line-strong pl-3 text-sm text-muted">
          {dict.directory.upcomingEmpty}
        </p>
      )}
    </div>
  );
}
