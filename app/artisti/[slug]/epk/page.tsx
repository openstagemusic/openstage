import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LocaleLink from "@/components/i18n/LocaleLink";
import PrintButton from "@/components/epk/PrintButton";
import SocialLinks from "@/components/directory/SocialLinks";
import { getArtistBySlug } from "@/lib/directory/queries";
import { artistPath } from "@/lib/events/paths";
import { formatEventDate } from "@/lib/events/format";
import { listUpcomingEventsByArtist } from "@/lib/events/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";
import { hasAnySocialLink } from "@/lib/social/links";

type EpkPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EpkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const artist = await getArtistBySlug(slug);
  if (!artist) return { title: dict.epk.eyebrow };

  return {
    title: `${artist.name} — ${dict.epk.eyebrow}`,
    description: artist.bio?.slice(0, 160) ?? dict.epk.eyebrow,
    robots: { index: false, follow: true },
    alternates: { canonical: absoluteUrl(withLocale(locale, artistPath(artist))) },
  };
}

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

export default async function ArtistEpkPage({ params }: EpkPageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.epk;
  const artist = await getArtistBySlug(slug);

  if (!artist) notFound();

  const events = (await listUpcomingEventsByArtist(artist.id)).slice(0, 8);

  return (
    <div className="epk-page mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16 print:max-w-none print:px-0 print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <LocaleLink
          href={artistPath(artist)}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
        >
          ← {t.back}
        </LocaleLink>
        <PrintButton label={t.print} />
      </div>

      <header className="mt-8 grid gap-6 border-t border-line pt-8 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start print:mt-0 print:border-black/20 print:pt-0">
        {artist.epkPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.epkPhotoUrl}
            alt={artist.name}
            className="h-48 w-48 border border-line object-cover print:h-40 print:w-40"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-48 w-48 items-center justify-center border border-violet/30 bg-violet/10 font-poster text-7xl leading-none text-violet print:h-40 print:w-40"
          >
            {initials(artist.name)}
          </span>
        )}

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.eyebrow}</p>
          <h1 className="mt-2 font-poster text-5xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-7xl">
            {artist.name}
          </h1>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {[artist.genre, artist.city].filter(Boolean).join(" · ")}
          </p>

          {artist.epkContact ? (
            <p className="mt-4 text-sm text-white">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {t.contact}:{" "}
              </span>
              {artist.epkContact}
            </p>
          ) : null}
        </div>
      </header>

      {artist.bio ? (
        <section className="mt-10 border-t border-line pt-6 print:mt-6 print:border-black/20">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.bio}</h2>
          <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted">
            {artist.bio}
          </p>
        </section>
      ) : null}

      {hasAnySocialLink(artist.links) ? (
        <section className="mt-8 border-t border-line pt-6 print:border-black/20">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.links}</h2>
          <div className="mt-3">
            <SocialLinks links={artist.links} dict={dict.social} />
          </div>
        </section>
      ) : null}

      <section className="mt-8 border-t border-line pt-6 print:border-black/20">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.dates}</h2>
        {events.length > 0 ? (
          <ul className="mt-3 border-t border-line print:border-black/20">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-3 print:border-black/20"
              >
                <span className="text-sm text-white">
                  {event.title}
                  {event.venue?.name ? ` · ${event.venue.name}` : ""}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                  {formatEventDate(event.startsAt, event.timezone, locale).full}
                  {event.city ? ` · ${event.city}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">{t.noDates}</p>
        )}
      </section>

      {artist.epkRider ? (
        <section className="mt-8 border-t border-line pt-6 print:border-black/20">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{t.rider}</h2>
          <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted">
            {artist.epkRider}
          </p>
        </section>
      ) : null}

      <footer className="mt-10 border-t border-line pt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-muted print:border-black/20">
        {t.footer} · {absoluteUrl(withLocale(locale, artistPath(artist)))}
      </footer>
    </div>
  );
}
