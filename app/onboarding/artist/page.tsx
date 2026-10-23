import { redirect } from "next/navigation";

import OnboardingForm from "@/components/auth/OnboardingForm";
import PageSearch from "@/components/claims/PageSearch";
import { canManageArtistProfile } from "@/lib/auth/roles";
import { getReplaceablePage } from "@/lib/claims/queries";
import { getArtistByProfileId, listArtists } from "@/lib/directory/queries";
import { artistPath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.onboarding.artistTitle,
    description: dict.onboarding.artistSubtitle,
  }));

type ArtistOnboardingProps = {
  searchParams: Promise<{ q?: string }>;
};

/**
 * Primo passo dell'artista: **cercare la propria scheda** prima di crearne una.
 *
 * La scheda dell'artista nasce da sola sulla piattaforma, dai concerti reali: chi
 * si iscrive quasi sempre ce l'ha già. Prima chiedevamo solo un nome e creavamo
 * subito una seconda scheda, chiudendo fuori l'artista da quella vera (un
 * profilo ne amministra una sola). Ora il modulo di creazione è la seconda
 * strada, dopo la ricerca.
 */
export default async function ArtistOnboardingPage({ searchParams }: ArtistOnboardingProps) {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) {
    redirect(withLocale(locale, "/login"));
  }

  // Il profilo artista appartiene agli artisti (la RLS lo impone anche sul database).
  if (!canManageArtistProfile(session.role)) {
    redirect(withLocale(locale, session.role === "venue" ? "/" : "/onboarding/role"));
  }

  const own = await getArtistByProfileId(session.id);

  // Una scheda **senza eventi** non è un muro: reclamandone un'altra il database
  // la elimina (`free_vacant_page`). Chi ce l'ha trova qui la ricerca che lo
  // porta alla scheda vera e il modulo di creazione resta chiuso. Chi ha una
  // scheda con eventi la modifica dall'account: non ne amministra due.
  const replaceable = own ? await getReplaceablePage("artist", session.id) : null;

  if (own && !replaceable) {
    redirect(withLocale(locale, "/account"));
  }

  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const found = term ? await listArtists({ filters: { query: term }, perPage: 8 }) : null;

  const dict = getDictionary(locale);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="border-b border-line pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
          {dict.onboarding.artistEyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-poster text-[clamp(2.75rem,9vw,5.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
          {dict.onboarding.artistTitle}
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.onboarding.artistSubtitle}
        </p>
      </header>

      <div className="mt-8 max-w-3xl space-y-8">
        <PageSearch
          kind="artist"
          term={term}
          results={(found?.items ?? []).map((artist) => ({
            id: artist.id,
            name: artist.name,
            city: artist.city,
            href: artistPath(artist),
          }))}
          ownedName={replaceable?.name ?? null}
          dict={dict.onboarding}
        />

        {replaceable ? null : (
          <div className="border-t border-line pt-8">
            <h2 className="font-display text-xl font-semibold">
              {dict.onboarding.createArtistTitle}
            </h2>
            <OnboardingForm dict={dict.onboarding} />
          </div>
        )}
      </div>
    </section>
  );
}
