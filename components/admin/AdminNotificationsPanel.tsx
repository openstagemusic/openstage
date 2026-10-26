"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  previewNotificationTargetAction,
  sendManualNotificationAction,
} from "@/app/actions/admin";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AdminNotification, NotificationStats } from "@/lib/admin/notifications";

const TYPE_KEYS = {
  event_cancelled: "notifTypeEventCancelled",
  event_updated: "notifTypeEventUpdated",
  event_reminder: "notifTypeEventReminder",
  follow_new_event: "notifTypeFollowNewEvent",
  claim: "notifTypeClaim",
  moderation: "notifTypeModeration",
  system: "notifTypeSystem",
} as const;

export default function AdminNotificationsPanel({
  stats,
  notifications,
  dict,
}: {
  stats: NotificationStats;
  notifications: AdminNotification[];
  dict: Dictionary["admin"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [mode, setMode] = useState<"user" | "role">("user");
  const [target, setTarget] = useState("");
  const [role, setRole] = useState("fan");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [preview, setPreview] = useState<{ count: number; label: string } | null>(null);
  const [busy, setBusy] = useState<"preview" | "send" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const readRate = stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0;
  const byType = Object.entries(stats.byType).sort(([, a], [, b]) => b - a);
  const maxType = Math.max(1, ...byType.map(([, value]) => value));

  function typeLabel(type: string): string {
    const key = TYPE_KEYS[type as keyof typeof TYPE_KEYS];
    return key ? dict[key] : type;
  }

  function resetPreview() {
    setPreview(null);
    setNotice(null);
    setError(null);
  }

  async function runPreview() {
    setBusy("preview");
    setNotice(null);
    setError(null);

    const outcome = await previewNotificationTargetAction({
      mode,
      value: mode === "user" ? target : role,
    });

    setBusy(null);

    if (!outcome.ok) {
      setPreview(null);
      setError(
        outcome.error === "not_found" ? dict.notifNoPreview : dict.notifSendFailed
      );
      return;
    }

    setPreview({
      count: outcome.count,
      label: outcome.label ?? (mode === "user" ? target : role),
    });
  }

  async function send() {
    if (!preview) {
      setError(dict.notifNoPreview);
      return;
    }

    if (!window.confirm(dict.notifConfirm.replace("{count}", String(preview.count)))) return;

    setBusy("send");
    setError(null);
    setNotice(null);

    const outcome = await sendManualNotificationAction({
      mode,
      value: mode === "user" ? target : role,
      title,
      body,
      href: href.trim() || null,
    });

    setBusy(null);

    if (!outcome.ok) {
      setError(dict.notifSendFailed);
      return;
    }

    setNotice(dict.notifSent.replace("{count}", String(outcome.count ?? 0)));
    setPreview(null);
    setTitle("");
    setBody("");
    setHref("");
    router.refresh();
  }

  return (
    <div>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: dict.notifTotal, value: stats.total },
          { label: dict.notifUnread, value: stats.unread },
          { label: dict.notifWeek, value: stats.lastWeek },
          { label: dict.notifReadRate, value: `${readRate}%` },
        ].map((item) => (
          <div key={item.label} className="border border-line bg-surface/40 p-3">
            <p className="font-poster text-2xl leading-none">{item.value}</p>
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {byType.length > 0 ? (
        <div className="mt-3 border border-line bg-surface/40 p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {dict.notifByType}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {byType.map(([type, value]) => (
              <div key={type}>
                <div className="flex items-baseline justify-between gap-2 text-[11px]">
                  <span className="text-muted">{typeLabel(type)}</span>
                  <span className="font-mono text-white">{value}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/10" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-cyan"
                    style={{ width: `${Math.max(3, Math.round((value / maxType) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">{dict.notifRecentTitle}</h2>

        {notifications.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{dict.notifEmpty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line border border-line">
            {notifications.slice(0, 100).map((notification) => (
              <li key={notification.id} className="p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-white">{notification.title}</p>
                    <p className="mt-0.5 break-all text-xs text-muted">
                      {notification.userEmail ?? "—"} · {typeLabel(notification.type)}
                    </p>
                    {notification.body ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{notification.body}</p>
                    ) : null}
                  </div>
                  <span
                    className={
                      notification.readAt
                        ? "border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
                        : "border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white"
                    }
                  >
                    {notification.readAt ? dict.notifReadLabel : dict.notifUnreadLabel}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[9px] tracking-[0.06em] text-muted">
                  {date.format(new Date(notification.createdAt))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 border border-line bg-surface/40 p-5">
        <h2 className="font-display text-lg font-semibold">{dict.notifSendTitle}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{dict.notifSendText}</p>
        <p className="mt-2 text-xs text-muted">{dict.notifNoBroadcast}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {dict.notifTarget}
            </span>
            <select
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as "user" | "role");
                setPreview(null);
                setNotice(null);
                setError(null);
              }}
              className="mt-1 w-full border border-line bg-surface px-2 py-2 text-sm text-white outline-none focus:border-cyan/60"
            >
              <option value="user">{dict.notifTargetUser}</option>
              <option value="role">{dict.notifTargetRole}</option>
            </select>
          </label>

          {mode === "user" ? (
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.notifTargetEmail}
              </span>
              <input
                type="email"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                  resetPreview();
                }}
                className="mt-1 w-full border border-line bg-surface px-2 py-2 text-sm text-white outline-none focus:border-cyan/60"
              />
            </label>
          ) : (
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {dict.notifTargetRole}
              </span>
              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value);
                  resetPreview();
                }}
                className="mt-1 w-full border border-line bg-surface px-2 py-2 text-sm text-white outline-none focus:border-cyan/60"
              >
                <option value="fan">{dict.notifRoleFan}</option>
                <option value="artist">{dict.notifRoleArtist}</option>
                <option value="venue">{dict.notifRoleVenue}</option>
                <option value="admin">{dict.notifRoleAdmin}</option>
              </select>
            </label>
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {dict.notifTitleLabel}
            </span>
            <input
              value={title}
              maxLength={120}
              onChange={(event) => {
                setTitle(event.target.value);
                setPreview(null);
              }}
              className="mt-1 w-full border border-line bg-surface px-2 py-2 text-sm text-white outline-none focus:border-cyan/60"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {dict.notifHrefLabel}
            </span>
            <input
              value={href}
              onChange={(event) => setHref(event.target.value)}
              placeholder="/dashboard"
              className="mt-1 w-full border border-line bg-surface px-2 py-2 text-sm text-white outline-none focus:border-cyan/60"
            />
            <span className="mt-1 block text-[10px] text-muted">{dict.notifHrefHint}</span>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {dict.notifBodyLabel}
          </span>
          <textarea
            value={body}
            maxLength={1000}
            rows={3}
            onChange={(event) => {
              setBody(event.target.value);
              setPreview(null);
            }}
            className="mt-1 w-full border border-line bg-surface px-2 py-2 text-sm text-white outline-none focus:border-cyan/60"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runPreview()}
            className="inline-flex min-h-10 items-center border border-line-strong px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:border-cyan/50 disabled:opacity-50"
          >
            {busy === "preview" ? dict.notifPreviewing : dict.notifPreview}
          </button>
          <button
            type="button"
            disabled={busy !== null || !preview}
            onClick={() => void send()}
            className="inline-flex min-h-10 items-center border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-violet disabled:opacity-50"
          >
            {busy === "send" ? dict.notifSending : dict.notifSend}
          </button>
        </div>

        {preview ? (
          <p className="mt-3 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-sm text-white">
            {dict.notifPreviewResult
              .replace("{count}", String(preview.count))
              .replace("{label}", preview.label)}
          </p>
        ) : null}

        {notice ? (
          <p className="mt-3 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-sm text-white">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 border-l-2 border-pink bg-pink/10 px-3 py-2 text-sm text-white">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
