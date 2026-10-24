import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import NotificationList from "@/components/notifications/NotificationList";
import LocaleLink from "@/components/i18n/LocaleLink";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { listNotifications, type NotificationType } from "@/lib/notifications/queries";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const TYPES: NotificationType[] = [
  "event_cancelled",
  "event_updated",
  "event_reminder",
  "follow_new_event",
  "claim",
  "moderation",
  "system",
];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  const dict = getDictionary(locale);
  const t = dict.notifications;
  const params = await searchParams;
  const type = TYPES.includes(params.type as NotificationType)
    ? (params.type as NotificationType)
    : null;

  const notifications = await listNotifications(session.id, type);
  const hasUnread = notifications.some((notification) => notification.readAt === null);

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{t.eyebrow}</p>
        <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em] sm:text-5xl">
          {t.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.subtitle}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <LocaleLink
          href="/dashboard/notifiche"
          className="border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
        >
          {t.filterAll}
        </LocaleLink>
        {TYPES.map((item) => (
          <LocaleLink
            key={item}
            href={`/dashboard/notifiche?type=${item}`}
            className={
              type === item
                ? "border border-cyan bg-cyan/10 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white"
                : "border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
            }
          >
            {t.types[item]}
          </LocaleLink>
        ))}
      </div>

      {hasUnread ? (
        <form action={markAllNotificationsReadAction} className="mt-5">
          <button
            type="submit"
            className="border border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-line-strong"
          >
            {t.markAll}
          </button>
        </form>
      ) : null}

      {notifications.length === 0 ? (
        <section className="mt-8 border border-line bg-surface/60 p-6">
          <h2 className="font-display text-xl font-semibold">{t.emptyTitle}</h2>
          <p className="mt-2 text-sm text-muted">{t.emptyText}</p>
        </section>
      ) : (
        <div className="mt-6">
          <NotificationList notifications={notifications} dict={t} locale={locale} />
        </div>
      )}
    </div>
  );
}
