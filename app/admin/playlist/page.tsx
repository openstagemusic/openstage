import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminPlaylistPanel from "@/components/admin/AdminPlaylistPanel";
import { listPlaylistSubmissions } from "@/lib/admin/playlist";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Le tracce proposte dagli artisti per la playlist.
 *
 * L'aggiunta su Spotify resta manuale: qui si verifica il link, si apre il
 * brano e si registra l'esito. Nessun OAuth, nessuna scrittura automatica.
 */
export default async function AdminPlaylistPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const submissions = await listPlaylistSubmissions();

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.content}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {dict.admin.playlistTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {dict.admin.playlistText}
        </p>
      </header>

      <AdminPlaylistPanel submissions={submissions} dict={dict.admin} locale={locale} />
    </div>
  );
}
