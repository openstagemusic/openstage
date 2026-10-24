import Link from "@/components/i18n/LocaleLink";

import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.auth.forgotTitle,
    description: dict.auth.forgotSubtitle,
  }));

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <AuthShell
      eyebrow={dict.auth.forgotEyebrow}
      title={dict.auth.forgotTitle}
      accent={dict.auth.forgotAccent}
      lead={dict.auth.forgotLead}
      tagline={dict.auth.tagline}
      values={dict.auth.values}
      footer={
        <p>
          {dict.auth.backToLogin}{" "}
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
            {dict.auth.forgotPanelTitle}
          </h2>
        </div>
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted">03</span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">{dict.auth.forgotPanelText}</p>

      <ForgotPasswordForm dict={dict.auth} />
    </AuthShell>
  );
}
