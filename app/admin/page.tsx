import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminMetrics from "@/components/admin/AdminMetrics";
import AdminQueue from "@/components/admin/AdminQueue";
import Link from "@/components/i18n/LocaleLink";
import { getAdminMetrics } from "@/lib/admin/queries";
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
import { countNewContactMessages } from "@/lib/messages/queries";

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

  const [pending, toVerify, unverified, verified, drafts, newMessages, metrics] =
    await Promise.all([
      listPendingClaims(),
      listClaimsToVerify(),
      listUnverifiedProfiles(),
      listVerifiedProfiles(),
      listDraftEvents(),
      countNewContactMessages(),
      getAdminMetrics(),
    ]);

  const t = dict.admin;

  const kpis: Array<{ label: string; value: number; href?: string }> = [
    { label: t.kpiPending, value: pending.length, href: "/admin/claim" },
    { label: t.kpiVerify, value: toVerify.length, href: "/admin/claim" },
    { label: t.kpiUnverified, value: unverified.length, href: "/admin/utenti" },
    { label: t.kpiDrafts, value: drafts.length, href: "/admin/bozze" },
    { label: t.kpiMessages, value: newMessages, href: "/admin/messaggi" },
    { label: t.kpiVerified, value: verified.length, href: "/admin/claim" },
  ];

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {t.controlRoom}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {t.overviewTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.overviewText}</p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => {
          const content = (
            <>
              <p className="font-poster text-4xl leading-none">{kpi.value}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {kpi.label}
              </p>
            </>
          );

          return kpi.href ? (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="border border-line bg-surface/60 p-5 transition-colors hover:border-cyan/50"
            >
              {content}
            </Link>
          ) : (
            <div key={kpi.label} className="border border-line bg-surface/60 p-5">
              {content}
            </div>
          );
        })}
      </div>

      <AdminMetrics metrics={metrics} dict={t} />

      <h2 className="mt-12 font-display text-2xl font-semibold">{t.queueTitle}</h2>
      <div className="mt-5">
        <AdminQueue
          pending={pending}
          toVerify={toVerify}
          unverified={unverified}
          verified={verified}
          drafts={drafts}
          dict={t}
        />
      </div>
    </div>
  );
}
