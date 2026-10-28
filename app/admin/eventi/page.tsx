import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminEventsPanel from "@/components/admin/AdminEventsPanel";
import AdminListToolbar from "@/components/admin/AdminListToolbar";
import Pagination from "@/components/ui/Pagination";
import Link from "@/components/i18n/LocaleLink";
import {
  filterModerationEvents,
  MODERATION_FILTERS,
  type ModerationFilter,
} from "@/lib/admin/filters";
import {
  ADMIN_PAGE_SIZE,
  firstParam,
  listParams,
  paginate,
  parsePage,
  pickFilter,
  type AdminSearchParams,
} from "@/lib/admin/list";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { listModerationEvents } from "@/lib/moderation/queries";

/**
 * Le serate già online, viste dall'admin.
 *
 * È la seconda metà della moderazione: la coda (`/admin`) si occupa di quello
 * che **aspetta** di entrare, questa pagina di quello che è **già** entrato e
 * può essere segnalato. Chi non è admin riceve un 404, come per la coda.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return {
    title: dict.admin.moderationTitle,
    description: dict.admin.moderationSubtitle,
    robots: { index: false, follow: false },
  };
}

type AdminEventsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function AdminEventsPage({ searchParams }: AdminEventsPageProps) {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const params = await searchParams;

  const q = firstParam(params.q);
  const status = pickFilter(params.status, MODERATION_FILTERS) as ModerationFilter;
  const page = parsePage(params.page);

  const events = await listModerationEvents(2000);
  const filtered = filterModerationEvents(events, { q, status });
  const paged = paginate(filtered, page);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/admin" className="text-sm text-muted transition-colors hover:text-white">
        ← {dict.admin.title}
      </Link>

      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
        {dict.admin.moderationTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{dict.admin.moderationSubtitle}</p>

      <Link
        href="/admin/eventi/nuovo"
        className="mt-4 inline-flex min-h-10 items-center border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
      >
        {dict.admin.aiCreateOpen}
      </Link>

      <AdminListToolbar
        q={q}
        exportList="events"
        dict={dict.admin}
        filters={[
          {
            key: "status",
            label: dict.admin.listFilterStatus,
            value: status,
            options: [
              { value: "all", label: dict.admin.moderationFilterAll },
              { value: "online", label: dict.admin.moderationFilterOnline },
              { value: "past", label: dict.admin.moderationFilterPast },
              { value: "paused", label: dict.admin.moderationFilterPaused },
              { value: "reported", label: dict.admin.moderationFilterReported },
              { value: "cancelled", label: dict.admin.moderationFilterCancelled },
            ],
          },
        ]}
      />

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
        {dict.admin.listResults.replace("{n}", String(paged.total))}
      </p>

      <AdminEventsPanel events={paged.rows} dict={dict.admin} locale={locale} />

      <div className="mt-8">
        <Pagination
          currentPage={paged.page}
          totalItems={paged.total}
          basePath="/admin/eventi"
          perPage={ADMIN_PAGE_SIZE}
          params={listParams({ q, status })}
          labels={{
            previous: dict.pagination.previous,
            next: dict.pagination.next,
            label: dict.pagination.label,
          }}
        />
      </div>
    </main>
  );
}
