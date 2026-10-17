import type { Metadata } from "next";
import Link from "@/components/i18n/LocaleLink";
import { notFound } from "next/navigation";

import ClaimPanel, { type ClaimState } from "@/components/claims/ClaimPanel";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import EventTeaser from "@/components/events/EventTeaser";
import JsonLd from "@/components/seo/JsonLd";
import { canManageArtistProfile } from "@/lib/auth/roles";
import { getReplaceablePage } from "@/lib/claims/queries";
import { getArtistByProfileId, getArtistBySlug } from "@/lib/directory/queries";
import { artistPath } from "@/lib/events/paths";
import { listUpcomingEventsByArtist } from "@/lib/events/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";
import { getSessionProfile } from "@/lib/supabase/session";

type ArtistPageProps = {
  params: Promise<{ slug: string }>;
};

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
  const events = await listUpcomingEventsByArtist(artist.id);

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

  const data = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artist.name,
    url: absoluteUrl(`/${locale}${artistPath(artist)}`),
    genre: artist.genre ?? undefined,
    sameAs: artist.spotifyUrl ? [artist.spotifyUrl] : undefined,
    homeLocation: artist.city ? { "@type": "Place", name: artist.city } : undefined,
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <JsonLd data={data} />

      <Link href="/artisti" className="text-sm text-muted transition-colors hover:text-white">
        ← {t.backToArtists}
      </Link>

      <div
        className="mt-6 h-1.5 w-full rounded-full bg-gradient-to-r from-violet via-cyan to-pink"
        aria-hidden="true"
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
        {artist.genre ? (
          <span className="rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 text-white">
            {artist.genre}
          </span>
        ) : null}
        {artist.city ? (
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-muted">
            {artist.city}
          </span>
        ) : null}
        {artist.verified ? (
          <VerifiedBadge dict={t} />
        ) : artist.claimed ? null : (
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-muted">
            {t.badgeUnclaimed}
          </span>
        )}
      </div>

      <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
        {artist.name}
      </h1>

      {artist.spotifyUrl ? (
        <p className="mt-4">
          <a
            href={artist.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cyan transition-opacity hover:opacity-80"
          >
            {t.spotify}
          </a>
        </p>
      ) : null}

      {artist.bio ? (
        <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted">{artist.bio}</p>
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

      <h2 className="mt-12 font-display text-xl font-semibold">{t.upcomingTitle}</h2>

      {events.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventTeaser key={event.id} event={event} locale={locale} dict={dict} />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted">{t.upcomingEmpty}</p>
      )}
    </div>
  );
}
