import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminQueue from "@/components/admin/AdminQueue";
import Link from "@/components/i18n/LocaleLink";
import {
  isCurrentUserAdmin,
  listClaimsToVerify,
  listDraftEvents,
  listPendingClaims,
  listUnverifiedProfiles,
  listVerifiedProfiles,
} from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

/**
 * Coda di moderazione: reclami, verifiche ed eventi in bozza.
 *
 * Chi non è l'admin riceve un 404, non un "accesso negato": la pagina non deve
 * nemmeno rivelare di esistere. Il permesso lo decide `is_admin()` nel
 * database, la stessa funzione che poi autorizza ogni azione.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return {
    title: dict.admin.title,
    description: dict.admin.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function AdminPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [pending, toVerify, unverified, verified, drafts] = await Promise.all([
    listPendingClaims(),
    listClaimsToVerify(),
    listUnverifiedProfiles(),
    listVerifiedProfiles(),
    listDraftEvents(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <div
        className="h-1.5 w-full rounded-full bg-gradient-to-r from-violet via-cyan to-pink"
        aria-hidden="true"
      />

      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {dict.admin.title}
      </h1>
      <p className="mt-2 text-sm text-muted">{dict.admin.subtitle}</p>

      <Link
        href="/admin/eventi"
        className="mt-4 inline-flex rounded-full border border-cyan/40 bg-cyan/10 px-4 py-2 text-xs text-white transition-colors hover:bg-cyan/20"
      >
        {dict.admin.moderationLink}
      </Link>

      <div className="mt-10">
        <AdminQueue
          pending={pending}
          toVerify={toVerify}
          unverified={unverified}
          verified={verified}
          drafts={drafts}
          dict={dict.admin}
        />
      </div>
    </div>
  );
}
