import type { Metadata } from "next";
import Link from "@/components/i18n/LocaleLink";
import { notFound } from "next/navigation";

import ClaimPanel, { type ClaimState } from "@/components/claims/ClaimPanel";
import ViewTracker from "@/components/analytics/ViewTracker";
import SocialLinks from "@/components/directory/SocialLinks";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import BrandBanner from "@/components/directory/BrandBanner";
import BookingPanel from "@/components/booking/BookingPanel";
import FollowButton from "@/components/directory/FollowButton";
import EventTeaser from "@/components/events/EventTeaser";
import JsonLd from "@/components/seo/JsonLd";
import { canManageArtistProfile } from "@/lib/auth/roles";
import { getReplaceablePage } from "@/lib/claims/queries";
import { getArtistByProfileId, getArtistBySlug } from "@/lib/directory/queries";
import { getFollowCount, isFollowing } from "@/lib/follows/queries";
import { artistPath } from "@/lib/events/paths";
import { listPastEventsByArtist, listUpcomingEventsByArtist } from "@/lib/events/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";
import { hasAnySocialLink } from "@/lib/social/links";
import { parseSpotifyLink, spotifyEmbedHeight } from "@/lib/spotify/links";
import { getSessionProfile } from "@/lib/supabase/session";

type ArtistPageProps = {
  params: Promise<{ slug: string }>;
};

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

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) return {};

  // La descrizione è composta solo da dati reali: genere e città quando ci sono.
  const description = [artist.name, artist.genre, artist.city].filter(Boolean).join(" · ");

  return {
    title: artist.name,
    description,
    openGraph: { title: artist.name, description, type: "profile" },
  };
}

/**
 * Scheda pubblica dell'artista: dati reali dal database, prossimi concerti
 * presi dagli eventi pubblicati. Se la scheda non è ancora stata reclamata
 * dall'artista lo dice apertamente, senza fingersi qualcun altro.
 */
export default async function ArtistPage({ params }: ArtistPageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const artist = await getArtistBySlug(slug);

  if (!artist) notFound();

  const dict = getDictionary(locale);
  const t = dict.directory;
  const session = await getSessionProfile();
  const spotify = parseSpotifyLink(artist.spotifyUrl);

  const [events, past, following, followers] = await Promise.all([
    listUpcomingEventsByArtist(artist.id),
    listPastEventsByArtist(artist.id),
    isFollowing("artist", artist.id, session?.id ?? null),
    getFollowCount("artist", artist.id),
  ]);

  // Il reclamo di una scheda artista è immediato: non esiste uno stato "in
  // attesa". O è libera, o è di chi guarda, o è di qualcun altro.
  //
  // Due casi meritano una spiegazione al posto di un pulsante che finirebbe in
  // errore, perché il database è severo: chi non ha il ruolo giusto (e può
  // ancora sceglierlo o no) e chi amministra già una scheda con eventi (ne
  // amministra una sola). Chi invece ha una scheda **senza eventi** può
  // reclamare: il database la elimina e prende questa, e lo diciamo prima.
  const canManage = session !== null && canManageArtistProfile(session.role);

  const replace =
    !artist.claimed && canManage && session
      ? await getReplaceablePage("artist", session.id, artist.id)
      : null;

  const ownsAnother =
    !artist.claimed && canManage && session && replace === null
      ? (await getArtistByProfileId(session.id)) !== null
      : false;

  const claimState: ClaimState = artist.claimed
    ? artist.profileId === session?.id
      ? "mine"
      : "claimed"
    : session === null
      ? "unclaimed"
      : !canManage
        ? "wrongRole"
        : ownsAnother
          ? "owned"
          : "unclaimed";

  const sameAs = Object.values(artist.links).filter(
    (url): url is string => typeof url === "string" && url.length > 0
  );

  const data = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artist.name,
    url: absoluteUrl(`/${locale}${artistPath(artist)}`),
    genre: artist.genre ?? undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    homeLocation: artist.city ? { "@type": "Place", name: artist.city } : undefined,
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <JsonLd data={data} />
      <ViewTracker kind="artist" id={artist.id} />

      <Link
        href="/artisti"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        ← {t.backToArtists}
      </Link>

      <div className="relative mt-8 overflow-hidden border border-line">
        <div className="absolute inset-0">
          {artist.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.bannerUrl}
              alt=""
              className="h-full w-full scale-105 object-cover opacity-40 blur-[2px]"
            />
          ) : (
            <BrandBanner />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/30" />

        <header className="relative grid gap-6 p-5 pt-16 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start sm:p-8 sm:pt-20">
        <span
          aria-hidden="true"
          className="flex h-32 w-32 items-center justify-center overflow-hidden border border-violet/30 bg-violet/10 font-poster text-6xl leading-none text-violet"
        >
          {artist.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(artist.name)
          )}
        </span>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {artist.genre ? (
              <span className="border border-violet/40 bg-violet/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                {artist.genre}
              </span>
            ) : null}
            {artist.city ? (
              <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {artist.city}
              </span>
            ) : null}
            {artist.verified ? (
              <VerifiedBadge label={t.badgeVerified} />
            ) : artist.claimed ? null : (
              <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {t.badgeUnclaimed}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-balance font-poster text-4xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-6xl">
            {artist.name}
          </h1>

          {hasAnySocialLink(artist.links) ? (
            <div className="mt-5">
              <SocialLinks links={artist.links} dict={dict.social} />
            </div>
          ) : null}

          {artist.bio ? (
            <p className="mt-6 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted">
              {artist.bio}
            </p>
          ) : null}

          <div className="mt-6">
            <FollowButton
              subjectType="artist"
              subjectId={artist.id}
              initialFollowing={following}
              initialFollowers={followers}
              isAuthenticated={session !== null}
              isOwnPage={artist.profileId === session?.id}
              dict={dict.follow}
            />
          </div>

        </div>
        </header>
      </div>

      <BookingPanel
        subjectType="artist"
        subjectId={artist.id}
        profileId={artist.profileId}
        viewerRole={session?.role ?? null}
        isAuthenticated={session !== null}
        subjectPath={`/${locale}${artistPath(artist)}`}
        dict={dict.booking}
      />

      <div className="mt-4 print:hidden">
        <Link
          href={`${artistPath(artist)}/epk`}
          className="inline-flex min-h-10 items-center border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
        >
          {dict.epk.eyebrow} <span aria-hidden="true">↗</span>
        </Link>
      </div>

      {spotify ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">{dict.spotify.listen}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {dict.spotify.listenText}
          </p>
          <div className="mt-4 max-w-2xl overflow-hidden border border-line bg-bg">
            <iframe
              title={`${artist.name} — ${dict.spotify.embedTitle}`}
              src={spotify.embedUrl}
              width="100%"
              height={spotifyEmbedHeight(spotify.kind)}
              style={{ border: 0 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        </section>
      ) : null}

      <ClaimPanel
        subjectType="artist"
        subjectId={artist.id}
        state={claimState}
        isAuthenticated={session !== null}
        canUpgradeRole={session?.role === "fan"}
        replaceName={replace?.name ?? null}
        dict={dict.claims}
      />

      <h2 className="mt-12 font-display text-2xl font-semibold">{t.upcomingTitle}</h2>

      {events.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventTeaser key={event.id} event={event} locale={locale} dict={dict} />
          ))}
        </div>
      ) : (
        <p className="mt-5 border-l-2 border-line-strong pl-3 text-sm text-muted">{t.upcomingEmpty}</p>
      )}

      {past.length > 0 ? (
        <>
          <h2 className="mt-12 font-display text-2xl font-semibold">{t.pastTitle}</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <EventTeaser key={event.id} event={event} locale={locale} dict={dict} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
