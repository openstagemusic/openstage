import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import AdminVerifyList from "@/components/admin/AdminVerifyList";
import { isCurrentUserAdmin, listUnverifiedProfiles } from "@/lib/claims/queries";
import { listAdminUsers } from "@/lib/admin/queries";
import type { UserRole } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { artistPath, venuePath } from "@/lib/events/paths";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminUsersPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const users = await listAdminUsers();
  const unverified = await listUnverifiedProfiles();

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

      <AdminUsersPanel users={users} roleLabels={roleLabels} dict={dict.admin} />
    </div>
  );
}
