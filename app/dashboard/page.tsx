import type { Metadata } from "next";
import { redirect } from "next/navigation";

import LocaleLink from "@/components/i18n/LocaleLink";
import { canManageEvents } from "@/lib/auth/roles";
import { listMyEvents, listSavedEvents } from "@/lib/dashboard/queries";
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

  const t = getDictionary(locale).dashboard;
  const canManage = canManageEvents(session.role);

  const [events, saved] = await Promise.all([
    canManage ? listMyEvents(session.id) : Promise.resolve([]),
    listSavedEvents(),
  ]);

  const count = (status: "draft" | "published" | "cancelled") =>
    events.filter((event) => event.status === status).length;

  const cards = [
    ...(canManage
      ? [
          { label: t.statDrafts, value: count("draft"), href: "/dashboard/events" },
          { label: t.statPublished, value: count("published"), href: "/dashboard/events" },
          { label: t.statCancelled, value: count("cancelled"), href: "/dashboard/events" },
        ]
      : []),
    { label: t.statSaved, value: saved.length, href: "/dashboard/saved" },
  ];

  return (
    <div>
      <div
        className="h-px w-full bg-gradient-to-r from-violet/70 via-cyan/40 to-transparent"
        aria-hidden="true"
      />

      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {t.overviewTitle}
      </h1>
      <p className="mt-2 text-sm text-muted">{t.overviewText}</p>
      <p className="mt-1 text-xs text-muted">{session.email}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <LocaleLink
            key={card.label}
            href={card.href}
            className="glass rounded-3xl border border-white/10 p-5 transition-colors hover:border-white/25"
          >
            <p className="font-display text-3xl font-bold">{card.value}</p>
            <p className="mt-1 text-sm text-muted">{card.label}</p>
            <p className="mt-3 text-xs text-cyan">
              {t.statHint} <span aria-hidden="true">→</span>
            </p>
          </LocaleLink>
        ))}
      </div>

      {canManage ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <LocaleLink
            href="/dashboard/events/new"
            className="rounded-full bg-violet-strong px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t.navNew}
          </LocaleLink>
          <LocaleLink
            href="/dashboard/events"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5"
          >
            {t.navEvents}
          </LocaleLink>
        </div>
      ) : null}
    </div>
  );
}
