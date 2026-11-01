import type { Metadata } from "next";
import { redirect } from "next/navigation";

import Link from "@/components/i18n/LocaleLink";
import { ACTION_LINE } from "@/components/ui/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { listMyContactTickets } from "@/lib/support/queries";
import { getSessionProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Le richieste che l'utente ha mandato dal modulo contatti.
 *
 * Prima non esisteva: la risposta arrivava via email e nella notifica, ma la
 * notifica portava al modulo — cioè a riscrivere. Qui si legge la
 * conversazione, con lo stato del ticket.
 */
export default async function MyRequestsPage() {
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session) redirect(withLocale(locale, "/login"));

  const dict = getDictionary(locale);
  const t = dict.dashboard.requests;
  const tickets = await listMyContactTickets();

  const statusLabel = (status: "new" | "read" | "closed") =>
    status === "closed" ? t.statusClosed : status === "read" ? t.statusRead : t.statusNew;

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{t.eyebrow}</p>
      <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.95] tracking-[-0.02em]">
        {t.title}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t.lead}</p>

      {tickets.length === 0 ? (
        <div className="mt-8 border-y border-line py-8">
          <p className="font-display text-lg font-semibold">{t.emptyTitle}</p>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">{t.emptyText}</p>
          <Link href="/contatti" className={`${ACTION_LINE} mt-5`}>
            {t.emptyCta} <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="border border-line bg-surface/60">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold">{ticket.excerpt}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {t.topic}: {t.topics[ticket.topic as keyof typeof t.topics] ?? ticket.topic} ·{" "}
                    {formatDate(ticket.createdAt)}
                  </p>
                </div>
                <span
                  className={
                    ticket.status === "closed"
                      ? "border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted"
                      : "border border-cyan/40 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan"
                  }
                >
                  {statusLabel(ticket.status)}
                </span>
              </div>

              <div className="px-4 py-4">
                <p className="whitespace-pre-line text-sm leading-relaxed text-white/90">
                  {ticket.body}
                </p>

                {ticket.replies.length > 0 ? (
                  <div className="mt-4 space-y-3 border-t border-line pt-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">
                      {t.replyTitle}
                    </p>
                    {ticket.replies.map((reply) => (
                      <div key={reply.id} className="border-l-2 border-cyan/50 pl-3">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-white/90">
                          {reply.body}
                        </p>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                          OpenStage · {formatDate(reply.sentAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 border-t border-line pt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {t.noReply}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <Link href="/contatti" className={ACTION_LINE}>
          {t.newRequest} <span aria-hidden="true">→</span>
        </Link>
        <Link href="/dashboard" className={ACTION_LINE}>
          {dict.dashboard.title}
        </Link>
      </div>
    </div>
  );
}
