import {
  deleteNotificationAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import LocaleLink from "@/components/i18n/LocaleLink";
import TrashIcon from "@/components/notifications/TrashIcon";
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
          <li key={notification.id} className="border-b border-line py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
                    {dict.types[notification.type]}
                  </span>
                  {unread ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden="true" />
                  ) : null}
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

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {unread ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="id" value={notification.id} />
                      <button
                        type="submit"
                        className="border-b border-line-strong pb-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-cyan hover:text-cyan"
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
              </div>

              <form action={deleteNotificationAction} className="shrink-0">
                <input type="hidden" name="id" value={notification.id} />
                <button
                  type="submit"
                  aria-label={dict.deleteOne}
                  title={dict.deleteOne}
                  className="inline-flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-pink"
                >
                  <TrashIcon />
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
