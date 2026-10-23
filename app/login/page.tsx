import Link from "@/components/i18n/LocaleLink";

import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.auth.loginTitle,
    description: dict.auth.loginSubtitle,
  }));

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const params = await searchParams;
  // Solo percorsi interni: evita redirect aperti verso altri domini.
  const nextPath =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : null;

  return (
    <AuthShell
      eyebrow={dict.auth.loginEyebrow}
      title={dict.auth.loginTitle}
      accent={dict.auth.loginAccent}
      lead={dict.auth.loginLead}
      tagline={dict.auth.tagline}
      values={dict.auth.values}
      footer={
        <p>
          {dict.auth.noAccount}{" "}
          <Link href="/register" className="text-cyan hover:underline">
            {dict.nav.register}
          </Link>
        </p>
      }
    >
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">OpenStage</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{dict.auth.loginPanelTitle}</h2>
        </div>
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted">01</span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">{dict.auth.loginPanelText}</p>

      <LoginForm dict={dict.auth} nextPath={nextPath} />
    </AuthShell>
  );
}
