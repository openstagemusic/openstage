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
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <header>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
              {dict.onboarding.roleEyebrow}
            </p>
            <h1 className="mt-4 font-poster text-[clamp(2.75rem,9vw,5.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
              {dict.onboarding.roleLockedTitle}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
              {dict.onboarding.roleLockedText}
            </p>
          </header>

          <div className="border border-line bg-surface/50 p-5 sm:p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {dict.onboarding.roleLockedTitle}
            </p>
            <span className="mt-4 inline-flex border border-violet/50 bg-violet/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-white">
              {dict.onboarding[ROLE_LABEL_KEY[session.role]]}
            </span>

            <p className="mt-5 text-sm leading-relaxed text-muted">
              {dict.onboarding.roleLockedNewAccount}
            </p>

            <Link
              href="/events/new"
              className="mt-6 inline-flex min-h-11 items-center justify-center border border-violet/50 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet/10"
            >
              {dict.onboarding.roleLockedCta}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
            {dict.onboarding.roleEyebrow}
          </p>
          <h1 className="mt-4 font-poster text-[clamp(2.75rem,9vw,5.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
            {dict.onboarding.roleTitle}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
            {dict.onboarding.roleSubtitle}
          </p>
        </header>

        <div className="border border-line bg-surface/40 p-5 sm:p-7">
          <RolePicker dict={dict.onboarding} />
        </div>
      </div>
    </section>
  );
}
