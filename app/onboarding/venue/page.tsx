import { redirect } from "next/navigation";

import VenueOnboardingForm from "@/components/auth/VenueOnboardingForm";
import PendingRequestPanel from "@/components/claims/PendingRequestPanel";
import PageSearch from "@/components/claims/PageSearch";
import { canManageVenueProfile } from "@/lib/auth/roles";
import { getMyPendingRequest, getReplaceablePage } from "@/lib/claims/queries";
import { getVenueByProfileId, listVenues } from "@/lib/directory/queries";
import { venuePath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.onboarding.venueTitle,
    description: dict.onboarding.venueSubtitle,
  }));

type VenueOnboardingProps = {
  searchParams: Promise<{ q?: string }>;
};

/**
 * Primo passo del locale: **cercare la propria scheda** prima di crearne una.
 *
 * Vale la stessa regola degli artisti: la scheda del locale può già esistere,
 * quindi la ricerca viene prima e la creazione dopo.
 */
export default async function VenueOnboardingPage({ searchParams }: VenueOnboardingProps) {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) {
    redirect(withLocale(locale, "/login"));
  }

  // La scheda del locale appartiene ai locali (la RLS lo impone anche sul database).
  if (!canManageVenueProfile(session.role)) {
    redirect(withLocale(locale, session.role === "artist" ? "/" : "/onboarding/role"));
  }

  const own = await getVenueByProfileId(session.id);

  // Come per gli artisti: una scheda senza eventi si può sostituire, una con
  // eventi si modifica dall'account.
  const replaceable = own ? await getReplaceablePage("venue", session.id) : null;

  if (own && !replaceable) {
    redirect(withLocale(locale, "/account"));
  }

  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const found = term ? await listVenues({ filters: { query: term }, perPage: 8 }) : null;

  // Richiesta in attesa: la ricerca resta, il modulo di creazione no. Il
  // database bloccherebbe comunque l'inserimento (0014), ma qui si vede prima,
  // e da qui si può ritirare la richiesta.
  const pendingRequest = await getMyPendingRequest();

  const dict = getDictionary(locale);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="border-b border-line pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
          {dict.onboarding.venueEyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-poster text-[clamp(2.75rem,9vw,5.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
          {dict.onboarding.venueTitle}
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.onboarding.venueSubtitle}
        </p>
      </header>

      <div className="mt-8 max-w-3xl space-y-8">
        <PageSearch
          kind="venue"
          term={term}
          results={(found?.items ?? []).map((venue) => ({
            id: venue.id,
            name: venue.name,
            city: venue.city,
            href: venuePath(venue),
          }))}
          ownedName={replaceable?.name ?? null}
          dict={dict.onboarding}
        />

        {pendingRequest ? (
          // Da questa pagina si chiedono solo schede di locali: l'indirizzo è
          // sempre quello del locale.
          <PendingRequestPanel
            claimId={pendingRequest.id}
            subjectName={pendingRequest.subjectName}
            subjectHref={venuePath({ slug: pendingRequest.subjectSlug })}
            createdAt={pendingRequest.createdAt}
            dict={dict.claims}
          />
        ) : replaceable ? null : (
          <div className="border-t border-line pt-8">
            <h2 className="font-display text-xl font-semibold">
              {dict.onboarding.createVenueTitle}
            </h2>
            <VenueOnboardingForm dict={dict.onboarding} />
          </div>
        )}
      </div>
    </section>
  );
}
