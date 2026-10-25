import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminMfaBypassPanel from "@/components/admin/AdminMfaBypassPanel";
import AdminMfaPanel from "@/components/admin/AdminMfaPanel";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminSecurityPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const [factors, assurance, session] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    getSessionProfile(),
  ]);

  const verified = factors.data?.totp.find((factor) => factor.status === "verified") ?? null;
  const aal2 = assurance.data?.currentLevel === "aal2";
  const bypassUntil = session?.mfaBypassUntil ?? null;
  const bypassActive = bypassUntil !== null && new Date(bypassUntil).getTime() > Date.now();

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.system}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.mfaTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.mfaSubtitle}
        </p>
        {!aal2 && !bypassActive ? (
          <p className="mt-4 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
            {dict.admin.mfaRequired}
          </p>
        ) : null}
      </header>

      <div className="mt-8">
        <AdminMfaPanel factorId={verified?.id ?? null} aal2={aal2} dict={dict.admin} />
        <AdminMfaBypassPanel
          bypassUntil={bypassUntil}
          hasFactor={verified !== null}
          dict={dict.admin}
        />
      </div>
    </div>
  );
}
