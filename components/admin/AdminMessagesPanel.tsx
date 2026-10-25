"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  adminReplyToMessageAction,
  adminSetMessageStatusAction,
  adminUpdateTicketAction,
} from "@/app/actions/messages";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type {
  ContactMessage,
  ContactMessageStatus,
  ContactPriority,
  ContactReply,
  ContactTopic,
} from "@/lib/messages/queries";

/**
 * I ticket nati dal modulo contatti.
 *
 * Priorità, assegnazione, storico risposte e risposta integrata. Lo stato resta
 * `new`, `read` o `closed`; riaprire un ticket lo rimette in coda senza
 * cancellare nulla. La risposta parte da Resend e viene registrata nel database
 * dalla funzione `admin_log_contact_reply`.
 */

type Filter = "all" | ContactMessageStatus;

const statusBadge: Record<ContactMessageStatus, string> = {
  new: "border-violet/40 bg-violet/15 text-violet-200",
  read: "border-cyan/40 bg-cyan/10 text-cyan",
  closed: "border-white/10 text-muted",
};

export default function AdminMessagesPanel({
  messages,
  replies,
  admins,
  dict,
  topics,
}: {
  messages: ContactMessage[];
  replies: ContactReply[];
  admins: Array<{ id: string; email: string | null }>;
  dict: Dictionary["admin"];
  topics: Dictionary["pages"]["contact"]["topics"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyNotice, setReplyNotice] = useState<string | null>(null);
  const [replyDoneId, setReplyDoneId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [ticketBusy, setTicketBusy] = useState<string | null>(null);
  const [ticketNotice, setTicketNotice] = useState<string | null>(null);

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

  function priorityLabel(priority: ContactPriority): string {
    if (priority === "low") return dict.ticketPriorityLow;
    if (priority === "high") return dict.ticketPriorityHigh;
    if (priority === "urgent") return dict.ticketPriorityUrgent;
    return dict.ticketPriorityNormal;
  }

  const priorityBadge: Record<ContactPriority, string> = {
    low: "border-white/10 text-muted",
    normal: "border-cyan/30 text-cyan",
    high: "border-violet/40 text-violet-200",
    urgent: "border-pink/50 bg-pink/10 text-pink",
  };

  async function updateTicket(
    message: ContactMessage,
    patch: { priority?: ContactPriority; assignedTo?: string | null }
  ) {
    setTicketBusy(message.id);
    setError(null);
    setTicketNotice(null);

    const outcome = await adminUpdateTicketAction({
      messageId: message.id,
      priority: patch.priority ?? message.priority,
      assignedTo: patch.assignedTo !== undefined ? patch.assignedTo : message.assignedTo,
    });

    setTicketBusy(null);

    if (!outcome.ok) {
      setError(dict.ticketUpdateFailed);
      return;
    }

    setTicketNotice(dict.ticketUpdated);
    router.refresh();
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

  async function sendReply(messageId: string) {
    setReplyBusy(true);
    setReplyError(null);
    setReplyNotice(null);
    setReplyDoneId(null);

    const outcome = await adminReplyToMessageAction({ messageId, body: replyText });

    setReplyBusy(false);

    if (!outcome.ok) {
      setReplyError(dict.messagesReplyFailed);
      return;
    }

    setReplyText("");
    setReplyId(null);
    setReplyNotice(dict.messagesReplySent);
    setReplyDoneId(messageId);
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
      {ticketNotice ? <p className="mt-3 text-xs text-cyan">{ticketNotice}</p> : null}

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
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] ${priorityBadge[message.priority]}`}
                      >
                        {priorityLabel(message.priority)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted">
                      {dict.messagesReceived}: {dateTime.format(new Date(message.createdAt))}
                      {" · "}
                      {dict.messagesLocale}: {message.locale.toUpperCase()}
                      {" · "}
                      {dict.ticketAssignedTo}:{" "}
                      {message.assignedEmail ?? dict.ticketUnassigned}
                    </p>

                    <a
                      href={`mailto:${message.email}`}
                      className="mt-1 inline-block break-all text-xs text-cyan transition-colors hover:text-white"
                    >
                      {message.email}
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyId(message.id);
                        setReplyText("");
                        setReplyError(null);
                        setReplyNotice(null);
                        setReplyDoneId(null);
                      }}
                      className="rounded-full border border-cyan/40 px-3 py-1.5 text-xs text-cyan transition-colors hover:bg-cyan/10"
                    >
                      {dict.messagesReplyInline}
                    </button>
                    <a
                      href={mailto}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted transition-colors hover:text-white"
                    >
                      {dict.messagesReply}
                    </a>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                      {dict.ticketPriority}
                    </span>
                    <select
                      value={message.priority}
                      disabled={ticketBusy === message.id}
                      onChange={(event) =>
                        void updateTicket(message, {
                          priority: event.target.value as ContactPriority,
                        })
                      }
                      className="mt-1 w-full border border-line bg-surface px-2 py-1.5 text-xs text-white outline-none focus:border-cyan/60"
                    >
                      {(["low", "normal", "high", "urgent"] as ContactPriority[]).map((priority) => (
                        <option key={priority} value={priority}>
                          {priorityLabel(priority)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                      {dict.ticketAssignedTo}
                    </span>
                    <select
                      value={message.assignedTo ?? ""}
                      disabled={ticketBusy === message.id}
                      onChange={(event) =>
                        void updateTicket(message, {
                          assignedTo: event.target.value || null,
                        })
                      }
                      className="mt-1 w-full border border-line bg-surface px-2 py-1.5 text-xs text-white outline-none focus:border-cyan/60"
                    >
                      <option value="">{dict.ticketUnassigned}</option>
                      {admins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.email ?? admin.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="mt-4 whitespace-pre-line break-words text-sm leading-relaxed text-white/90">
                  {message.message}
                </p>

                {(() => {
                  const messageReplies = replies.filter((reply) => reply.messageId === message.id);
                  if (messageReplies.length === 0) return null;

                  return (
                    <div className="mt-4 border-t border-line pt-3">
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                        {dict.ticketRepliesTitle}
                      </p>
                      <ul className="mt-2 space-y-3">
                        {messageReplies.map((reply) => (
                          <li key={reply.id} className="border-l-2 border-cyan/40 pl-3">
                            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-white/90">
                              {reply.body}
                            </p>
                            <p className="mt-1 font-mono text-[9px] tracking-[0.06em] text-muted">
                              {dateTime.format(new Date(reply.sentAt))}
                              {reply.adminEmail ? ` · ${reply.adminEmail}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                {replyId === message.id ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void sendReply(message.id);
                    }}
                    className="mt-4 border border-line bg-white/[0.03] p-3"
                  >
                    <label
                      htmlFor={`reply-${message.id}`}
                      className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
                    >
                      {dict.messagesReplyInline}
                    </label>
                    <textarea
                      id={`reply-${message.id}`}
                      className="mt-2 w-full border border-line bg-surface px-3 py-2 text-sm text-white outline-none focus:border-cyan/60"
                      rows={4}
                      maxLength={4000}
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      placeholder={dict.messagesReplyPlaceholder}
                    />
                    {replyError ? <p className="mt-2 text-xs text-pink">{replyError}</p> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="submit"
                        disabled={replyBusy || replyText.trim().length < 10}
                        className="rounded-full bg-violet-strong px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {replyBusy ? dict.messagesReplySending : dict.messagesReplySend}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyId(null)}
                        className="text-xs text-muted transition-colors hover:text-white"
                      >
                        {dict.moderationCancel}
                      </button>
                    </div>
                  </form>
                ) : null}

                {replyDoneId === message.id && replyNotice ? (
                  <p className="mt-3 text-xs text-cyan">{replyNotice}</p>
                ) : null}

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
