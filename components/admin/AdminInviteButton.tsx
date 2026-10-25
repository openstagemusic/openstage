"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClaimInviteAction } from "@/app/actions/admin";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Invito a reclamare una scheda non reclamata.
 *
 * L'admin scrive l'email: se l'account esiste parte una notifica in-app,
 * altrimenti un'email con il link monouso. Il token non passa mai dal browser.
 */
export default function AdminInviteButton({
  subjectType,
  subjectId,
  subjectName,
  dict,
}: {
  subjectType: "artist" | "venue";
  subjectId: string;
  subjectName: string;
  dict: Dictionary["admin"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const outcome = await createClaimInviteAction({ subjectType, subjectId, email });

    setBusy(false);

    if (!outcome.ok) {
      setError(outcome.error ?? dict.inviteFailed);
      return;
    }

    setNotice(outcome.accountExists ? dict.inviteSentNotification : dict.inviteSentEmail);
    setOpen(false);
    setEmail("");
    router.refresh();
  }

  return (
    <div className="mt-2">
      {open ? (
        <div className="border border-line bg-surface/60 p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-cyan">
            {dict.inviteTitle} · {subjectName}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">{dict.inviteHint}</p>
          <label htmlFor={`invite-${subjectId}`} className="mt-3 block font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {dict.inviteEmail}
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              id={`invite-${subjectId}`}
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={dict.inviteEmailPlaceholder}
              className="min-h-9 flex-1 border border-line bg-bg px-2 py-1.5 text-sm text-white outline-none placeholder:text-muted focus:border-cyan"
            />
            <button
              type="button"
              disabled={busy || !email.trim()}
              onClick={() => void send()}
              className="inline-flex min-h-9 items-center justify-center border border-cyan/50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-50"
            >
              {busy ? dict.inviteSending : dict.inviteSend}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEmail("");
                setError(null);
              }}
              className="inline-flex min-h-9 items-center justify-center px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted hover:text-white"
            >
              {dict.moderationCancel}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-9 items-center border border-line-strong px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/50 hover:text-cyan"
        >
          {dict.inviteAction}
        </button>
      )}

      {notice ? (
        <p className="mt-2 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-xs text-white">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 border-l-2 border-pink bg-pink/10 px-3 py-2 text-xs text-white">
          {error}
        </p>
      ) : null}
    </div>
  );
}
