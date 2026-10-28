import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminListToolbar from "@/components/admin/AdminListToolbar";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import AdminVerifyList from "@/components/admin/AdminVerifyList";
import Pagination from "@/components/ui/Pagination";
import { isCurrentUserAdmin, listUnverifiedProfiles } from "@/lib/claims/queries";
import { filterAdminUsers } from "@/lib/admin/filters";
import {
  ADMIN_PAGE_SIZE,
  firstParam,
  listParams,
  paginate,
  parsePage,
  pickFilter,
  type AdminSearchParams,
} from "@/lib/admin/list";
import { listAdminUsers } from "@/lib/admin/queries";
import type { UserRole } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { artistPath, venuePath } from "@/lib/events/paths";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type AdminUsersPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const params = await searchParams;

  const q = firstParam(params.q);
  const role = pickFilter(params.role, ["fan", "artist", "venue", "admin"]);
  const status = pickFilter(params.status, ["verified", "unverified", "suspended"]);
  const page = parsePage(params.page);

  const [users, unverified] = await Promise.all([listAdminUsers(2000), listUnverifiedProfiles()]);
  const filtered = filterAdminUsers(users, { q, role, status });
  const paged = paginate(filtered, page);

  const roleLabels: Record<UserRole, string> = {
    fan: dict.nav.roleFan,
    artist: dict.nav.roleArtist,
    venue: dict.nav.roleVenue,
    admin: dict.nav.roleAdmin,
  };

  const toVerify = unverified.map((profile) => ({
    profileId: profile.id,
    name: profile.subjectName ?? profile.email ?? dict.admin.unknownEmail,
    email: profile.email,
    roleLabel: profile.role === "artist" ? dict.nav.roleArtist : dict.nav.roleVenue,
    href:
      profile.subjectType && profile.subjectSlug
        ? profile.subjectType === "artist"
          ? artistPath({ slug: profile.subjectSlug })
          : venuePath({ slug: profile.subjectSlug })
        : undefined,
  }));

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.people}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.usersTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.usersSubtitle}
        </p>
      </header>

      <AdminVerifyList items={toVerify} dict={dict.admin} />

      <AdminListToolbar
        q={q}
        exportList="users"
        dict={dict.admin}
        filters={[
          {
            key: "role",
            label: dict.admin.listFilterRole,
            value: role,
            options: [
              { value: "all", label: dict.admin.listAll },
              { value: "fan", label: dict.nav.roleFan },
              { value: "artist", label: dict.nav.roleArtist },
              { value: "venue", label: dict.nav.roleVenue },
              { value: "admin", label: dict.nav.roleAdmin },
            ],
          },
          {
            key: "status",
            label: dict.admin.listFilterStatus,
            value: status,
            options: [
              { value: "all", label: dict.admin.listAll },
              { value: "verified", label: dict.admin.userVerified },
              { value: "unverified", label: dict.admin.userNotVerified },
              { value: "suspended", label: dict.admin.userSuspended },
            ],
          },
        ]}
      />

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
        {dict.admin.listResults.replace("{n}", String(paged.total))}
      </p>

      <AdminUsersPanel users={paged.rows} roleLabels={roleLabels} dict={dict.admin} />

      <div className="mt-8">
        <Pagination
          currentPage={paged.page}
          totalItems={paged.total}
          basePath="/admin/utenti"
          perPage={ADMIN_PAGE_SIZE}
          params={listParams({ q, role, status })}
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
