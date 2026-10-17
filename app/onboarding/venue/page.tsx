import { redirect } from "next/navigation";

import VenueOnboardingForm from "@/components/auth/VenueOnboardingForm";
import LocaleLink from "@/components/i18n/LocaleLink";
import { canManageVenueProfile } from "@/lib/auth/roles";
import { getVenueByProfileId } from "@/lib/directory/queries";
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

export default async function VenueOnboardingPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) {
    redirect(withLocale(locale, "/login"));
  }

  // La scheda del locale appartiene ai locali (la RLS lo impone anche sul database).
  if (!canManageVenueProfile(session.role)) {
    redirect(withLocale(locale, session.role === "artist" ? "/" : "/onboarding/role"));
  }

  // Un profilo amministra una scheda sola (`venues_profile_id_key`): chi ne ha
  // già una la modifica dall'account, non ne crea una seconda.
  if (await getVenueByProfileId(session.id)) {
    redirect(withLocale(locale, "/account"));
  }

  const dict = getDictionary(locale);

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        {dict.onboarding.venueTitle}
      </h1>
      <p className="mt-2 text-sm text-muted">{dict.onboarding.venueSubtitle}</p>
      <p className="mt-3 text-xs text-muted">
        {dict.onboarding.venueExisting}{" "}
        <LocaleLink href="/locali" className="text-cyan transition-opacity hover:opacity-80">
          {dict.onboarding.venueExistingCta} →
        </LocaleLink>
      </p>

      <VenueOnboardingForm dict={dict.onboarding} />
    </section>
  );
}
