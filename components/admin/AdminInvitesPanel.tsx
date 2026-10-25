"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { revokeClaimInviteAction } from "@/app/actions/admin";
import LocaleLink from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { ClaimInvite } from "@/lib/claims/invites";
import { artistPath, venuePath } from "@/lib/events/paths";

export default function AdminInvitesPanel({
  invites,
  dict,
}: {
  invites: ClaimInvite[];
  dict: Dictionary["admin"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
  });

  const statusLabel = (status: ClaimInvite["status"]) =>
    status === "pending"
      ? dict.inviteStatusPending
      : status === "accepted"
        ? dict.inviteStatusAccepted
        : status === "revoked"
          ? dict.inviteStatusRevoked
          : dict.inviteStatusExpired;

  async function revoke(invite: ClaimInvite) {
    if (!window.confirm(dict.inviteRevokeConfirm)) return;

    setBusy(invite.id);
    setError(null);
    setNotice(null);

    const outcome = await revokeClaimInviteAction({ inviteId: invite.id });
    setBusy(null);

    if (!outcome.ok) {
      setError(dict.inviteRevokeFailed);
      return;
    }

    setNotice(dict.inviteRevoked);
    router.refresh();
  }

  return (
    <section className="mt-10 border border-line bg-surface/40 p-4">
      <h2 className="font-display text-lg font-semibold">
        {dict.invitePendingTitle} <span className="text-muted">({invites.length})</span>
      </h2>

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

      {invites.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{dict.invitePendingEmpty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {invites.map((invite) => {
            const href = invite.subjectSlug
              ? invite.subjectType === "artist"
                ? artistPath({ slug: invite.subjectSlug })
                : venuePath({ slug: invite.subjectSlug })
              : null;
            const expired =
              invite.status === "pending" && new Date(invite.expiresAt).getTime() <= Date.now();
            const status = expired ? "expired" : invite.status;

            return (
              <li key={invite.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {href ? (
                        <LocaleLink
                          href={href}
                          className="font-display text-base font-semibold hover:text-cyan"
                        >
                          {invite.subjectName ?? invite.subjectId}
                        </LocaleLink>
                      ) : (
                        <span className="font-display text-base font-semibold">
                          {invite.subjectName ?? invite.subjectId}
                        </span>
                      )}
                      <span
                        className={
                          status === "pending"
                            ? "border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white"
                            : "border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
                        }
                      >
                        {statusLabel(status)}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                        {invite.channel === "email"
                          ? dict.inviteChannelEmail
                          : dict.inviteChannelNotification}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-muted">{invite.email}</p>
                    <p className="mt-0.5 font-mono text-[10px] tracking-[0.06em] text-muted">
                      {dict.inviteSentAt}: {date.format(new Date(invite.createdAt))} ·{" "}
                      {dict.inviteExpires}: {date.format(new Date(invite.expiresAt))}
                    </p>
                  </div>

                  {invite.status === "pending" && !expired ? (
                    <button
                      type="button"
                      disabled={busy === invite.id}
                      onClick={() => void revoke(invite)}
                      className="inline-flex min-h-9 items-center border border-pink/50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-pink transition-colors hover:bg-pink/10 disabled:opacity-50"
                    >
                      {busy === invite.id ? dict.working : dict.inviteRevoke}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
