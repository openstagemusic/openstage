import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminMetrics from "@/components/admin/AdminMetrics";
import { getAdminMetrics } from "@/lib/admin/queries";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";

/**
 * Panoramica della control room: ricerca, numeri reali e niente duplicazioni.
 *
 * Le code di moderazione vivono nelle schede che le gestiscono (claim, utenti,
 * artisti, locali, bozze, segnalazioni). Qui resta solo ciò che serve per
 * orientarsi e cercare.
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
  const t = dict.admin;
  const metrics = await getAdminMetrics();

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {t.controlRoom}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {t.nav.overview}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.overviewText}</p>

        <form
          action={withLocale(locale, "/admin/cerca")}
          method="get"
          className="mt-6 flex flex-col gap-2 sm:flex-row"
        >
          <label htmlFor="admin-search" className="sr-only">
            {t.searchTitle}
          </label>
          <input
            id="admin-search"
            name="q"
            type="search"
            minLength={2}
            required
            placeholder={t.searchPlaceholder}
            className="min-h-11 flex-1 border border-line bg-surface px-4 py-3 text-sm text-white outline-none placeholder:text-muted focus:border-cyan"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center border border-cyan bg-cyan px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-bg transition-colors hover:bg-cyan/90"
          >
            {t.searchButton}
          </button>
        </form>
      </header>

      <AdminMetrics metrics={metrics} dict={t} />
    </div>
  );
}
