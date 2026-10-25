import type { Metadata } from "next";
import { redirect } from "next/navigation";

import LocaleLink from "@/components/i18n/LocaleLink";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import NeedsPageNotice from "@/components/dashboard/NeedsPageNotice";
import { canManageEvents } from "@/lib/auth/roles";
import { listMyEvents, listSavedEvents } from "@/lib/dashboard/queries";
import { getArtistByProfileId, getVenueByProfileId } from "@/lib/directory/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return { title: dict.dashboard.overviewTitle, description: dict.dashboard.overviewText };
}

/** Panoramica: i numeri dei propri eventi e dei preferiti, con le scorciatoie. */
export default async function DashboardPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  const dict = getDictionary(locale);
  const t = dict.dashboard;
  const canManage = canManageEvents(session.role);

  const [events, saved, artistPage, venuePage] = await Promise.all([
    canManage ? listMyEvents(session.id) : Promise.resolve([]),
    listSavedEvents(),
    session.role === "artist" ? getArtistByProfileId(session.id) : Promise.resolve(null),
    session.role === "venue" ? getVenueByProfileId(session.id) : Promise.resolve(null),
  ]);

  const missingPage =
    session.role === "artist" ? !artistPage : session.role === "venue" ? !venuePage : false;

  const count = (status: "draft" | "published" | "cancelled") =>
    events.filter((event) => event.status === status).length;

  const cards = [
    ...(canManage
      ? [
          { label: t.statDrafts, value: count("draft"), href: "/dashboard/events#drafts" },
          { label: t.statPublished, value: count("published"), href: "/dashboard/events#upcoming" },
          { label: t.statCancelled, value: count("cancelled"), href: "/dashboard/events#cancelled" },
        ]
      : []),
    { label: t.statSaved, value: saved.length, href: "/dashboard/saved" },
  ];

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{t.title}</p>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
            {t.overviewTitle}
          </h1>
          {session.verified ? <VerifiedBadge label={dict.directory.badgeVerified} /> : null}
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.overviewText}</p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          {session.email}
        </p>
      </header>

      {missingPage ? (
        <div className="mt-8">
          <NeedsPageNotice
            role={session.role === "artist" ? "artist" : "venue"}
            dict={t}
          />
        </div>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <LocaleLink
            key={card.label}
            href={card.href}
            className="border border-line bg-surface/60 p-5 transition-colors hover:border-cyan/50"
          >
            <p className="font-poster text-4xl leading-none">{card.value}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {card.label}
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
              {t.statHint} <span aria-hidden="true">→</span>
            </p>
          </LocaleLink>
        ))}
      </div>

      {canManage && !missingPage ? (
        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:flex-wrap">
          <LocaleLink
            href="/dashboard/events/new"
            className="inline-flex min-h-11 items-center justify-center border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {t.navNew}
          </LocaleLink>
          <LocaleLink
            href="/dashboard/events"
            className="inline-flex min-h-11 items-center justify-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-line-strong"
          >
            {t.navEvents}
          </LocaleLink>
        </div>
      ) : null}
    </div>
  );
}
