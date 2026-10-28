import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminDraftsPanel from "@/components/admin/AdminDraftsPanel";
import AdminListToolbar from "@/components/admin/AdminListToolbar";
import Pagination from "@/components/ui/Pagination";
import { filterDrafts } from "@/lib/admin/filters";
import {
  ADMIN_PAGE_SIZE,
  firstParam,
  listParams,
  paginate,
  parsePage,
  type AdminSearchParams,
} from "@/lib/admin/list";
import { isCurrentUserAdmin, listDraftEvents } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type AdminDraftsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function AdminDraftsPage({ searchParams }: AdminDraftsPageProps) {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const params = await searchParams;

  const q = firstParam(params.q);
  const page = parsePage(params.page);

  const drafts = await listDraftEvents();
  const filtered = filterDrafts(drafts, q);
  const paged = paginate(filtered, page);

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.content}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.draftsTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.draftsText}
        </p>
      </header>

      <AdminListToolbar q={q} exportList="drafts" dict={dict.admin} />

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
        {dict.admin.listResults.replace("{n}", String(paged.total))}
      </p>

      <AdminDraftsPanel drafts={paged.rows} dict={dict.admin} />

      <div className="mt-8">
        <Pagination
          currentPage={paged.page}
          totalItems={paged.total}
          basePath="/admin/bozze"
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
