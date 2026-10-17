import { redirect } from "next/navigation";

import OnboardingForm from "@/components/auth/OnboardingForm";
import LocaleLink from "@/components/i18n/LocaleLink";
import { canManageArtistProfile } from "@/lib/auth/roles";
import { getArtistByProfileId } from "@/lib/directory/queries";
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

export default async function ArtistOnboardingPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) {
    redirect(withLocale(locale, "/login"));
  }

  // Il profilo artista appartiene agli artisti (la RLS lo impone anche sul database).
  if (!canManageArtistProfile(session.role)) {
    redirect(withLocale(locale, session.role === "venue" ? "/" : "/onboarding/role"));
  }

  // Un profilo amministra una scheda sola (`artists_profile_id_key`): chi ne ha
  // già una la modifica dall'account, non ne crea una seconda.
  if (await getArtistByProfileId(session.id)) {
    redirect(withLocale(locale, "/account"));
  }

  const dict = getDictionary(locale);

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        {dict.onboarding.artistTitle}
      </h1>
      <p className="mt-2 text-sm text-muted">{dict.onboarding.artistSubtitle}</p>
      <p className="mt-3 text-xs text-muted">
        {dict.onboarding.artistExisting}{" "}
        <LocaleLink href="/artisti" className="text-cyan transition-opacity hover:opacity-80">
          {dict.onboarding.artistExistingCta} →
        </LocaleLink>
      </p>

      <OnboardingForm dict={dict.onboarding} />
    </section>
  );
}
