import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminListToolbar from "@/components/admin/AdminListToolbar";
import AdminReportsPanel from "@/components/admin/AdminReportsPanel";
import Pagination from "@/components/ui/Pagination";
import {
  filterAdminReports,
  REPORT_FILTERS,
  type ReportFilter,
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
import { listAdminReports } from "@/lib/admin/queries";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type AdminReportsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const params = await searchParams;

  const q = firstParam(params.q);
  const status = pickFilter(params.status, REPORT_FILTERS) as ReportFilter;
  const page = parsePage(params.page);

  const reports = await listAdminReports(2000);
  const filtered = filterAdminReports(reports, { q, status });
  const paged = paginate(filtered, page);

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.content}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.reportsTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.reportsSubtitle}
        </p>
      </header>

      <AdminListToolbar
        q={q}
        exportList="reports"
        dict={dict.admin}
        filters={[
          {
            key: "status",
            label: dict.admin.listFilterStatus,
            value: status,
            options: [
              { value: "all", label: dict.admin.listAll },
              { value: "open", label: dict.admin.reportOpen },
              { value: "resolved", label: dict.admin.reportResolved },
              { value: "dismissed", label: dict.admin.reportDismissed },
            ],
          },
        ]}
      />

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
        {dict.admin.listResults.replace("{n}", String(paged.total))}
      </p>

      <AdminReportsPanel reports={paged.rows} dict={dict.admin} />

      <div className="mt-8">
        <Pagination
          currentPage={paged.page}
          totalItems={paged.total}
          basePath="/admin/segnalazioni"
          perPage={ADMIN_PAGE_SIZE}
          params={listParams({ q, status })}
          labels={{
            previous: dict.pagination.previous,
            next: dict.pagination.next,
            label: dict.pagination.label,
          }}
        />
      </div>
    </div>
  );
}
