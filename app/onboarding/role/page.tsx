import { redirect } from "next/navigation";

import RolePicker from "@/components/auth/RolePicker";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.onboarding.roleTitle,
    description: dict.onboarding.roleSubtitle,
  }));

export default async function RoleOnboardingPage() {
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
        {dict.onboarding.roleTitle}
      </h1>
      <p className="mt-2 text-sm text-muted">{dict.onboarding.roleSubtitle}</p>

      <RolePicker dict={dict.onboarding} />
    </section>
  );
}
