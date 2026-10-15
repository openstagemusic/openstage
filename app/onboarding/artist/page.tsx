import { redirect } from "next/navigation";

import OnboardingForm from "@/components/auth/OnboardingForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.onboarding.artistTitle,
    description: dict.onboarding.artistSubtitle,
  }));

export default async function ArtistOnboardingPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
