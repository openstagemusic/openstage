import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminListToolbar from "@/components/admin/AdminListToolbar";
import AdminTakedownPanel from "@/components/admin/AdminTakedownPanel";
import Pagination from "@/components/ui/Pagination";
import {
  filterTakedownNotices,
  TAKEDOWN_STATUSES,
  TAKEDOWN_TYPES,
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
import { listTakedownNotices } from "@/lib/admin/takedown";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type AdminTakedownPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function AdminTakedownPage({ searchParams }: AdminTakedownPageProps) {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const params = await searchParams;

  const q = firstParam(params.q);
  const status = pickFilter(params.status, TAKEDOWN_STATUSES);
  const type = pickFilter(params.type, TAKEDOWN_TYPES);
  const page = parsePage(params.page);

  const notices = await listTakedownNotices(2000);
  const filtered = filterTakedownNotices(notices, { q, status, type });
  const paged = paginate(filtered, page);

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.content}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.takedownTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.takedownSubtitle}
        </p>
      </header>

      <AdminListToolbar
        q={q}
        exportList="takedown"
        dict={dict.admin}
        filters={[
          {
            key: "status",
            label: dict.admin.listFilterStatus,
            value: status,
            options: [
              { value: "all", label: dict.admin.listAll },
              { value: "new", label: dict.admin.takedownStatusNew },
              { value: "reviewing", label: dict.admin.takedownStatusReviewing },
              { value: "actioned", label: dict.admin.takedownStatusActioned },
              { value: "rejected", label: dict.admin.takedownStatusRejected },
            ],
          },
          {
            key: "type",
            label: dict.admin.takedownType,
            value: type,
            options: [
              { value: "all", label: dict.admin.listAll },
              { value: "copyright", label: dict.admin.takedownTypeCopyright },
              { value: "trademark", label: dict.admin.takedownTypeTrademark },
              { value: "privacy", label: dict.admin.takedownTypePrivacy },
              { value: "defamation", label: dict.admin.takedownTypeDefamation },
              { value: "illegal", label: dict.admin.takedownTypeIllegal },
              { value: "other", label: dict.admin.takedownTypeOther },
            ],
          },
        ]}
      />

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
        {dict.admin.listResults.replace("{n}", String(paged.total))}
      </p>

      <AdminTakedownPanel notices={paged.rows} dict={dict.admin} />

      <div className="mt-8">
        <Pagination
          currentPage={paged.page}
          totalItems={paged.total}
          basePath="/admin/takedown"
          perPage={ADMIN_PAGE_SIZE}
          params={listParams({ q, status, type })}
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
