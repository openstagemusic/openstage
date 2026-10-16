import { redirect } from "next/navigation";

import OnboardingForm from "@/components/auth/OnboardingForm";
import { canManageArtistProfile } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.onboarding.artistTitle,
    description: dict.onboarding.artistSubtitle,
  }));

export default async function ArtistOnboardingPage() {
  const session = await getSessionProfile();

  if (!session) {
    redirect("/login");
  }

  // Il profilo artista appartiene agli artisti (la RLS lo impone anche sul database).
  if (!canManageArtistProfile(session.role)) {
    redirect(session.role === "venue" ? "/" : "/onboarding/role");
  }

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        {dict.onboarding.artistTitle}
      </h1>
      <p className="mt-2 text-sm text-muted">{dict.onboarding.artistSubtitle}</p>

      <OnboardingForm dict={dict.onboarding} />
    </section>
  );
}
