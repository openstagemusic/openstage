import Link from "@/components/i18n/LocaleLink";

import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "@/components/auth/RegisterForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.auth.registerTitle,
    description: dict.auth.registerSubtitle,
  }));

export default async function RegisterPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <AuthShell
      eyebrow={dict.auth.registerEyebrow}
      title={dict.auth.registerTitle}
      accent={dict.auth.registerAccent}
      lead={dict.auth.registerLead}
      tagline={dict.auth.tagline}
      values={dict.auth.values}
      footer={
        <p>
          {dict.auth.haveAccount}{" "}
          <Link href="/login" className="text-cyan hover:underline">
            {dict.nav.login}
          </Link>
        </p>
      }
    >
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">OpenStage</p>
          <h2 className="mt-1 font-display text-xl font-semibold">
            {dict.auth.registerPanelTitle}
          </h2>
        </div>
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted">02</span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">{dict.auth.registerPanelText}</p>

      <RegisterForm dict={dict.auth} />
    </AuthShell>
  );
}
