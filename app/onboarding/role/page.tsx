import Link from "@/components/i18n/LocaleLink";
import { redirect } from "next/navigation";

import RolePicker from "@/components/auth/RolePicker";
import { canChooseRole, ROLE_LABEL_KEY } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.onboarding.roleTitle,
    description: dict.onboarding.roleSubtitle,
  }));

export default async function RoleOnboardingPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) {
    redirect(withLocale(locale, "/login"));
  }

  const dict = getDictionary(locale);

  // Artista e locale sono definitivi: chi li ha già scelti non può più cambiare.
  if (!canChooseRole(session.role) && session.role) {
    return (
      <section className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {dict.onboarding.roleLockedTitle}
        </h1>
        <p className="mt-2 text-sm text-muted">{dict.onboarding.roleLockedText}</p>

        <span className="mt-6 inline-flex rounded-full border border-violet/40 bg-violet/10 px-3 py-1 text-sm text-white">
          {dict.onboarding[ROLE_LABEL_KEY[session.role]]}
        </span>

        <p className="mt-6 text-sm text-muted">{dict.onboarding.roleLockedNewAccount}</p>

        <Link
          href="/events/new"
          className="mt-8 inline-flex rounded-full bg-gradient-to-r from-violet to-cyan px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {dict.onboarding.roleLockedCta}
        </Link>
      </section>
    );
  }

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
