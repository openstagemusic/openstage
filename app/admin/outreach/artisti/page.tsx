import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminOutreachArtistRow from "@/components/admin/AdminOutreachArtistRow";
import LocaleLink from "@/components/i18n/LocaleLink";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { artistPath } from "@/lib/events/paths";
import { absoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type ArtistRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  instagram_url: string | null;
};

/**
 * Outreach artisti.
 *
 * Gli artisti quasi mai hanno un'email pubblica: il canale è il DM. Qui c'è
 * tutto quello che serve per mandarlo — il link alla scheda, il messaggio già
 * scritto con nome e link dentro, e il campo per salvare l'handle quando lo si
 * trova. Il pulsante «copia» evita di riscrivere lo stesso testo sei volte.
 */
export default async function AdminOutreachArtistsPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.admin.outreach;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artists")
    .select("id, name, slug, city, instagram_url")
    .is("profile_id", null)
    .order("name", { ascending: true });

  if (error) console.error("[outreach] artisti:", error.message);

  const artists = (data as ArtistRow[] | null) ?? [];

  const messageFor = (artist: ArtistRow) =>
    t.messageTemplate
      .replace(/\{name\}/g, artist.name)
      .replace(/\{url\}/g, absoluteUrl(artistPath(artist)))
      .replace(/\{city\}/g, artist.city ?? "Bergamo");

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          {dict.admin.nav.community}
        </p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
          {t.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.lead}</p>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {artists.length} {t.countLabel}
        </p>
      </header>

      {artists.length === 0 ? (
        <p className="mt-6 os-note">{t.empty}</p>
      ) : (
        <ul className="mt-6">
          {artists.map((artist) => (
            <AdminOutreachArtistRow
              key={artist.id}
              artistId={artist.id}
              name={artist.name}
              city={artist.city}
              profileUrl={absoluteUrl(artistPath(artist))}
              instagramUrl={artist.instagram_url}
              message={messageFor(artist)}
              dict={t}
            />
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <LocaleLink
          href="/admin"
          className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
        >
          {dict.admin.controlRoom}
        </LocaleLink>
        <LocaleLink
          href="/artisti"
          className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
        >
          {t.openDirectory}
        </LocaleLink>
        <LocaleLink
          href="/admin/outreach/canali"
          className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
        >
          {dict.admin.outreachChannels.title}
        </LocaleLink>
      </div>
    </div>
  );
}
