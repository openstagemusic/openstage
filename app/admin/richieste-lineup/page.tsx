import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminJoinRequestRow from "@/components/admin/AdminJoinRequestRow";
import LocaleLink from "@/components/i18n/LocaleLink";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Embedded<T> = T | T[] | null;

type RequestRow = {
  id: string;
  message: string | null;
  created_at: string;
  events: Embedded<{
    title: string;
    slug: string;
    city_key: string | null;
    starts_at: string;
    timezone: string | null;
  }>;
  artists: Embedded<{ name: string; slug: string }>;
};

function first<T>(value: Embedded<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Coda delle richieste «sono in questa serata».
 *
 * Approvare aggiunge l'artista alla lineup e gli manda una notifica. Non c'è
 * nulla di automatico: un locale potrebbe chiedere di unirsi al concerto di
 * qualcun altro, e l'unica difesa è che qualcuno guardi.
 */
export default async function AdminLineupRequestsPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.admin.lineupRequests;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_join_requests")
    .select(
      "id, message, created_at, events ( title, slug, city_key, starts_at, timezone ), artists ( name, slug )"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) console.error("[lineup] richieste:", error.message);

  const rows = (data as RequestRow[] | null) ?? [];

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
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {rows.length} {t.countLabel}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="mt-6 os-note">{t.empty}</p>
      ) : (
        <ul className="mt-6">
          {rows.map((row) => {
            const event = first(row.events);
            const artist = first(row.artists);
            if (!event || !artist) return null;

            const when = new Date(event.starts_at).toLocaleString(locale === "en" ? "en-GB" : "it-IT", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: event.timezone ?? "Europe/Rome",
            });

            return (
              <AdminJoinRequestRow
                key={row.id}
                request={{
                  id: row.id,
                  message: row.message,
                  createdAt: row.created_at,
                  artistName: artist.name,
                  artistSlug: artist.slug,
                  eventTitle: event.title,
                  eventHref: absoluteUrl(
                    withLocale(locale, `/eventi/${event.city_key ?? "bergamo"}/${event.slug}`)
                  ),
                  eventWhen: when,
                }}
                dict={t}
              />
            );
          })}
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
          href="/admin/eventi"
          className="border-b border-line pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
        >
          {dict.admin.nav.events}
        </LocaleLink>
      </div>
    </div>
  );
}
