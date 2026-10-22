"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminSetMessageStatusAction } from "@/app/actions/messages";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type {
  ContactMessage,
  ContactMessageStatus,
  ContactTopic,
} from "@/lib/messages/queries";

/**
 * La coda dei messaggi dal modulo contatti.
 *
 * Non c'è una risposta integrata: si risponde dalla propria email, con il
 * pulsante `mailto`. Il database serve a non perdere nulla e a sapere cosa è
 * ancora da leggere. Gli stati sono `new`, `read` e `closed`; riaprire un
 * messaggio lo rimette in coda senza cancellarlo.
 */

type Filter = "all" | ContactMessageStatus;

const statusBadge: Record<ContactMessageStatus, string> = {
  new: "border-violet/40 bg-violet/15 text-violet-200",
  read: "border-cyan/40 bg-cyan/10 text-cyan",
  closed: "border-white/10 text-muted",
};

export default function AdminMessagesPanel({
  messages,
  dict,
  topics,
}: {
  messages: ContactMessage[];
  dict: Dictionary["admin"];
  topics: Dictionary["pages"]["contact"]["topics"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateTime = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dateOnly = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
  });

  const counts: Record<Filter, number> = {
    all: messages.length,
    new: messages.filter((message) => message.status === "new").length,
    read: messages.filter((message) => message.status === "read").length,
    closed: messages.filter((message) => message.status === "closed").length,
  };

  const visible = messages.filter(
    (message) => filter === "all" || message.status === filter,
  );

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "all", label: dict.messagesFilterAll },
    { key: "new", label: dict.messagesFilterNew },
    { key: "read", label: dict.messagesFilterRead },
    { key: "closed", label: dict.messagesFilterClosed },
  ];

  function statusLabel(status: ContactMessageStatus): string {
    if (status === "read") return dict.messagesStatusRead;
    if (status === "closed") return dict.messagesStatusClosed;
    return dict.messagesStatusNew;
  }

  function topicLabel(topic: ContactTopic): string {
    return topics[topic] ?? topic;
  }

  async function run(messageId: string, status: ContactMessageStatus) {
    setBusy(messageId);
    setError(null);

    const outcome = await adminSetMessageStatusAction({ messageId, status });

    setBusy(null);

    if (!outcome.ok) {
      setError(dict.messagesFailed);
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            aria-pressed={filter === item.key}
            className={
              filter === item.key
                ? "rounded-full border border-cyan/50 bg-cyan/15 px-3 py-1 text-xs text-white"
                : "rounded-full border border-white/10 px-3 py-1 text-xs text-muted transition-colors hover:text-white"
            }
          >
            {item.label}
            <span className="ml-1.5 text-[0.65rem] opacity-70">{counts[item.key]}</span>
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-xs text-pink">{error}</p> : null}

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          {messages.length === 0 ? dict.messagesEmpty : dict.messagesEmptyFilter}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {visible.map((message) => {
            const working = busy === message.id;
            const mailto = `mailto:${message.email}?subject=${encodeURIComponent(
              `OpenStage — ${topicLabel(message.topic)}`,
            )}`;

            return (
              <li
                key={message.id}
                className={
                  message.status === "new"
                    ? "glass rounded-2xl border border-violet/40 p-5"
                    : "glass rounded-2xl border border-white/10 p-5"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-display text-base font-semibold text-white">
                        {message.name}
                      </p>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] ${statusBadge[message.status]}`}
                      >
                        {statusLabel(message.status)}
                      </span>
                      <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[0.65rem] text-muted">
                        {topicLabel(message.topic)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted">
                      {dict.messagesReceived}: {dateTime.format(new Date(message.createdAt))}
                      {" · "}
                      {dict.messagesLocale}: {message.locale.toUpperCase()}
                    </p>

                    <a
                      href={`mailto:${message.email}`}
                      className="mt-1 inline-block break-all text-xs text-cyan transition-colors hover:text-white"
                    >
                      {message.email}
                    </a>
                  </div>

                  <a
                    href={mailto}
                    className="rounded-full border border-cyan/40 px-3 py-1.5 text-xs text-cyan transition-colors hover:bg-cyan/10"
                  >
                    {dict.messagesReply}
                  </a>
                </div>

                <p className="mt-4 whitespace-pre-line break-words text-sm leading-relaxed text-white/90">
                  {message.message}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {message.status === "new" ? (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => void run(message.id, "read")}
                      className="rounded-full border border-cyan/40 px-3 py-1.5 text-xs text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-50"
                    >
                      {dict.messagesMarkRead}
                    </button>
                  ) : null}

                  {message.status !== "closed" ? (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => void run(message.id, "closed")}
                      className="rounded-full border border-violet/40 px-3 py-1.5 text-xs text-white transition-colors hover:bg-violet/10 disabled:opacity-50"
                    >
                      {dict.messagesMarkClosed}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => void run(message.id, "new")}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-muted transition-colors hover:text-white disabled:opacity-50"
                    >
                      {dict.messagesReopen}
                    </button>
                  )}

                  {message.readAt ? (
                    <span className="text-[0.65rem] text-muted">
                      {dict.messagesReadOn.replace(
                        "{date}",
                        dateOnly.format(new Date(message.readAt)),
                      )}
                    </span>
                  ) : null}
                  {message.closedAt ? (
                    <span className="text-[0.65rem] text-muted">
                      {dict.messagesClosedOn.replace(
                        "{date}",
                        dateOnly.format(new Date(message.closedAt)),
                      )}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
