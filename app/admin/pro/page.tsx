import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminProPanel from "@/components/admin/AdminProPanel";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { listAdminProRequests, listProEntitlements } from "@/lib/pro/queries";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Accessi Pro e coda delle richieste.
 *
 * Finché non c'è PayPal, l'accesso si concede a mano. La coda è un canale di
 * ascolto, non una promessa di sviluppo.
 */
export default async function AdminProPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const [requests, entitlements] = await Promise.all([
    listAdminProRequests(),
    listProEntitlements(),
  ]);

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.community}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.proTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.proText}
        </p>
      </header>

      <AdminProPanel
        requests={requests}
        entitlements={entitlements}
        dict={dict.admin}
        pro={dict.pro}
        locale={locale}
      />
    </div>
  );
}
