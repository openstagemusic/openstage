import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ResetPasswordPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/forgot-password"));

  return (
    <AuthShell
      eyebrow={dict.auth.resetEyebrow}
      title={dict.auth.resetTitle}
      accent={dict.auth.resetAccent}
      lead={dict.auth.resetLead}
      tagline={dict.auth.tagline}
      values={dict.auth.values}
      footer={<p>{dict.auth.resetPanelText}</p>}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">OpenStage</p>
          <h2 className="mt-1 font-display text-xl font-semibold">
            {dict.auth.resetPanelTitle}
          </h2>
        </div>
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted">04</span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">{dict.auth.resetPanelText}</p>

      <ResetPasswordForm dict={dict.auth} />
    </AuthShell>
  );
}
