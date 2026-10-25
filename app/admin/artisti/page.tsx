import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminDirectoryList from "@/components/admin/AdminDirectoryList";
import AdminVerifyList from "@/components/admin/AdminVerifyList";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { listAdminArtists } from "@/lib/admin/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { artistPath } from "@/lib/events/paths";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminArtistsPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const rows = await listAdminArtists();

  const toVerify = rows
    .filter((row) => row.claimed && !row.verified && row.profileId)
    .map((row) => ({
      profileId: row.profileId as string,
      name: row.name,
      email: row.ownerEmail,
      roleLabel: dict.admin.nav.artists,
      href: artistPath({ slug: row.slug }),
    }));

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.people}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.artistsTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.artistsSubtitle}
        </p>
      </header>

      <AdminVerifyList items={toVerify} dict={dict.admin} />

      <AdminDirectoryList rows={rows} kind="artist" dict={dict.admin} />
    </div>
  );
}
