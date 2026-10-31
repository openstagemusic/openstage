import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import DeleteAllNotificationsButton from "@/components/notifications/DeleteAllNotificationsButton";
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
  "booking_message",
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

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4">
        <LocaleLink
          href="/dashboard/notifiche"
          aria-current={type === null ? "page" : undefined}
          className={
            type === null
              ? "border-b border-cyan pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan"
              : "border-b border-transparent pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
          }
        >
          {t.filterAll}
        </LocaleLink>
        {TYPES.map((item) => (
          <LocaleLink
            key={item}
            href={`/dashboard/notifiche?type=${item}`}
            aria-current={type === item ? "page" : undefined}
            className={
              type === item
                ? "border-b border-cyan pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan"
                : "border-b border-transparent pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
            }
          >
            {t.types[item]}
          </LocaleLink>
        ))}
      </div>

      {notifications.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          {hasUnread ? (
            <form action={markAllNotificationsReadAction}>
              <button
                type="submit"
                className="border-b border-line-strong pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
              >
                {t.markAll}
              </button>
            </form>
          ) : null}

          <DeleteAllNotificationsButton label={t.deleteAll} confirmLabel={t.confirmDeleteAll} />
        </div>
      ) : null}

      {notifications.length === 0 ? (
        <section className="mt-8 border-t border-line pt-8">
          <h2 className="font-poster text-3xl uppercase leading-none">{t.emptyTitle}</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t.emptyText}</p>
        </section>
      ) : (
        <div className="mt-6">
          <NotificationList notifications={notifications} dict={t} locale={locale} />
        </div>
      )}
    </div>
  );
}
