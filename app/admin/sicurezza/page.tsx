import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminMfaPanel from "@/components/admin/AdminMfaPanel";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminSecurityPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const [factors, assurance] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  const verified = factors.data?.totp.find((factor) => factor.status === "verified") ?? null;
  const aal2 = assurance.data?.currentLevel === "aal2";

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
        {!aal2 ? (
          <p className="mt-4 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
            {dict.admin.mfaRequired}
          </p>
        ) : null}
      </header>

      <div className="mt-8">
        <AdminMfaPanel factorId={verified?.id ?? null} aal2={aal2} dict={dict.admin} />
      </div>
    </div>
  );
}
