import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminDirectoryList from "@/components/admin/AdminDirectoryList";
import AdminListToolbar from "@/components/admin/AdminListToolbar";
import AdminVerifyList from "@/components/admin/AdminVerifyList";
import Pagination from "@/components/ui/Pagination";
import { filterAdminDirectory } from "@/lib/admin/filters";
import {
  ADMIN_PAGE_SIZE,
  firstParam,
  listParams,
  paginate,
  parsePage,
  pickFilter,
  type AdminSearchParams,
} from "@/lib/admin/list";
import { listAdminVenues } from "@/lib/admin/queries";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { venuePath } from "@/lib/events/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type AdminVenuesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function AdminVenuesPage({ searchParams }: AdminVenuesPageProps) {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const params = await searchParams;

  const q = firstParam(params.q);
  const claimed = pickFilter(params.claimed, ["claimed", "unclaimed"]);
  const verified = pickFilter(params.verified, ["verified", "unverified"]);
  const page = parsePage(params.page);

  const rows = await listAdminVenues(2000);
  const filtered = filterAdminDirectory(rows, { q, claimed, verified });
  const paged = paginate(filtered, page);

  const toVerify = rows
    .filter((row) => row.claimed && !row.verified && row.profileId)
    .map((row) => ({
      profileId: row.profileId as string,
      name: row.name,
      email: row.ownerEmail,
      roleLabel: dict.admin.nav.venues,
      href: venuePath({ slug: row.slug }),
    }));

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.people}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.venuesTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.venuesSubtitle}
        </p>
      </header>

      <AdminVerifyList items={toVerify} dict={dict.admin} />

      <AdminListToolbar
        q={q}
        exportList="venues"
        dict={dict.admin}
        filters={[
          {
            key: "claimed",
            label: dict.admin.listFilterPage,
            value: claimed,
            options: [
              { value: "all", label: dict.admin.listAll },
              { value: "claimed", label: dict.admin.directoryClaimed },
              { value: "unclaimed", label: dict.admin.directoryUnclaimed },
            ],
          },
          {
            key: "verified",
            label: dict.admin.listFilterVerification,
            value: verified,
            options: [
              { value: "all", label: dict.admin.listAll },
              { value: "verified", label: dict.admin.userVerified },
              { value: "unverified", label: dict.admin.userNotVerified },
            ],
          },
        ]}
      />

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
        {dict.admin.listResults.replace("{n}", String(paged.total))}
      </p>

      <AdminDirectoryList rows={paged.rows} kind="venue" dict={dict.admin} />

      <div className="mt-8">
        <Pagination
          currentPage={paged.page}
          totalItems={paged.total}
          basePath="/admin/locali"
          perPage={ADMIN_PAGE_SIZE}
          params={listParams({ q, claimed, verified })}
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
