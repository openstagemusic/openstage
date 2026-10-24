import { markNotificationReadAction } from "@/app/actions/notifications";
import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Notification } from "@/lib/notifications/queries";
import type { Locale } from "@/lib/i18n/config";

function notificationBody(notification: Notification, dict: Dictionary["notifications"]): string | null {
  if (notification.type === "event_cancelled") {
    const eventTitle =
      typeof notification.metadata.eventTitle === "string"
        ? notification.metadata.eventTitle
        : notification.title;
    return dict.eventCancelled.replace("{event}", eventTitle);
  }

  return notification.body ?? notification.title;
}

/** Elenco server-rendered: ogni notifica è già una riga vera, non un placeholder. */
export default function NotificationList({
  notifications,
  dict,
  locale,
}: {
  notifications: Notification[];
  dict: Dictionary["notifications"];
  locale: Locale;
}) {
  const dateFormat = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <ul className="border-t border-line">
      {notifications.map((notification) => {
        const unread = notification.readAt === null;
        const body = notificationBody(notification, dict);

        return (
          <li
            key={notification.id}
            className="border-b border-line py-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
                {dict.types[notification.type]}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dateFormat.format(new Date(notification.createdAt))}
              </span>
            </div>

            {notification.href ? (
              <LocaleLink href={notification.href} className="mt-2 block hover:text-cyan">
                <span className="font-display text-lg font-semibold leading-tight">
                  {notification.type === "event_cancelled"
                    ? dict.types.event_cancelled
                    : notification.title}
                </span>
                {body ? <span className="mt-1 block text-sm text-muted">{body}</span> : null}
              </LocaleLink>
            ) : (
              <>
                <p className="mt-2 font-display text-lg font-semibold leading-tight">
                  {notification.title}
                </p>
                {body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
              </>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {unread ? (
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="id" value={notification.id} />
                  <button
                    type="submit"
                    className="border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
                  >
                    {dict.markRead}
                  </button>
                </form>
              ) : (
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  {dict.read}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
