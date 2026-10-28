import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminListToolbar from "@/components/admin/AdminListToolbar";
import Pagination from "@/components/ui/Pagination";
import { filterAuditEntries } from "@/lib/admin/filters";
import {
  ADMIN_PAGE_SIZE,
  firstParam,
  listParams,
  paginate,
  parsePage,
  type AdminSearchParams,
} from "@/lib/admin/list";
import { listAuditLog } from "@/lib/admin/queries";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type AdminAuditPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const params = await searchParams;

  const q = firstParam(params.q);
  const page = parsePage(params.page);

  const entries = await listAuditLog(2000);
  const filtered = filterAuditEntries(entries, q);
  const paged = paginate(filtered, page);

  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.system}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.auditTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.auditSubtitle}
        </p>
      </header>

      <AdminListToolbar q={q} exportList="audit" dict={dict.admin} />

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
        {dict.admin.listResults.replace("{n}", String(paged.total))}
      </p>

      {paged.rows.length === 0 ? (
        <p className="mt-6 border-l-2 border-line-strong pl-3 text-sm text-muted">
          {dict.admin.auditEmpty}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-line">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                <th className="px-3 py-2 font-normal">{dict.admin.auditWhen}</th>
                <th className="px-3 py-2 font-normal">{dict.admin.auditActor}</th>
                <th className="px-3 py-2 font-normal">{dict.admin.auditAction}</th>
                <th className="px-3 py-2 font-normal">{dict.admin.auditSubject}</th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((entry) => {
                const note =
                  typeof entry.metadata.note === "string" ? entry.metadata.note : null;

                return (
                  <tr key={entry.id} className="border-b border-line/60 align-top">
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">
                      {date.format(new Date(entry.createdAt))}
                    </td>
                    <td className="px-3 py-3 text-xs text-white">
                      {entry.actorEmail ?? "-"}
                    </td>
                    <td className="px-3 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-cyan">
                      {entry.action}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">
                      <p>
                        {entry.subjectType ?? "-"}
                        {entry.subjectId ? ` · ${entry.subjectId.slice(0, 8)}` : ""}
                      </p>
                      {note ? <p className="mt-1 text-white">{note}</p> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <Pagination
          currentPage={paged.page}
          totalItems={paged.total}
          basePath="/admin/audit"
          perPage={ADMIN_PAGE_SIZE}
          params={listParams({ q })}
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
