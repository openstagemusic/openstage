"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { decideClaimAction, revokeClaimAction, setProfileVerifiedAction } from "@/app/actions/claims";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import LocaleLink from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { ClaimRecord } from "@/lib/claims/queries";
import { artistPath, venuePath } from "@/lib/events/paths";

export default function AdminClaimsPanel({
  claims,
  pending,
  dict,
}: {
  claims: ClaimRecord[];
  pending: ClaimRecord[];
  dict: Dictionary["admin"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
  });

  async function decide(claim: ClaimRecord, approve: boolean) {
    setBusy(claim.id);
    setError(null);
    setNotice(null);

    const outcome = await decideClaimAction({ claimId: claim.id, approve });
    setBusy(null);

    if (!outcome.ok) {
      setError(dict.errorGeneric);
      return;
    }

    setNotice(approve ? dict.claimApproved : dict.claimRejected);
    router.refresh();
  }

  async function verify(claim: ClaimRecord) {
    setBusy(claim.id);
    setError(null);
    setNotice(null);

    const outcome = await setProfileVerifiedAction({ profileId: claim.profileId, verified: true });
    setBusy(null);

    if (!outcome.ok) {
      setError(dict.errorGeneric);
      return;
    }

    setNotice(dict.claimVerifiedNotice);
    router.refresh();
  }

  async function revoke(claim: ClaimRecord) {
    if (!window.confirm(dict.claimRevokeConfirm)) return;

    setBusy(claim.id);
    setError(null);
    setNotice(null);

    const outcome = await revokeClaimAction({ claimId: claim.id, note: note.trim() || null });
    setBusy(null);

    if (!outcome.ok) {
      setError(dict.claimRevokeFailed);
      return;
    }

    setOpenId(null);
    setNote("");
    setNotice(dict.claimRevoked);
    router.refresh();
  }

  const notices = (
    <>
      {notice ? (
        <p className="mb-4 border-l-2 border-cyan bg-cyan/10 px-4 py-3 text-sm text-white">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-4 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      ) : null}
    </>
  );

  return (
    <div className="mt-6">
      {notices}

      <section className="border border-line bg-surface/40 p-4">
        <h2 className="font-display text-lg font-semibold">
          {dict.pendingTitle} <span className="text-muted">({pending.length})</span>
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">{dict.pendingText}</p>

        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{dict.empty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {pending.map((claim) => {
              const href =
                claim.subjectType === "artist"
                  ? artistPath({ slug: claim.subjectSlug })
                  : venuePath({ slug: claim.subjectSlug });

              return (
                <li key={claim.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <LocaleLink href={href} className="font-display text-base font-semibold hover:text-cyan">
                        {claim.subjectName}
                      </LocaleLink>
                      <p className="mt-0.5 text-xs text-muted">
                        {claim.subjectType === "artist" ? dict.kindArtist : dict.kindVenue} ·{" "}
                        {claim.email ?? dict.unknownEmail} · {date.format(new Date(claim.createdAt))}
                      </p>
                      <a
                        href={claim.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-xs text-cyan hover:opacity-80"
                      >
                        {claim.proofUrl}
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy === claim.id}
                        onClick={() => void decide(claim, true)}
                        className="inline-flex min-h-9 items-center border border-cyan/50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-50"
                      >
                        {busy === claim.id ? dict.working : dict.approve}
                      </button>
                      <button
                        type="button"
                        disabled={busy === claim.id}
                        onClick={() => void decide(claim, false)}
                        className="inline-flex min-h-9 items-center border border-line-strong px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-white disabled:opacity-50"
                      >
                        {busy === claim.id ? dict.working : dict.reject}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <h2 className="mt-10 font-display text-xl font-semibold">
        {dict.claimsTitle} <span className="text-muted">({claims.length})</span>
      </h2>
      <p className="mt-1 text-sm text-muted">{dict.claimsSubtitle}</p>

      {claims.length === 0 ? (
        <p className="mt-5 border-l-2 border-line-strong pl-3 text-sm text-muted">{dict.claimsEmpty}</p>
      ) : (
        <ul className="mt-4 border-t border-line">
        {claims.map((claim) => {
          const href =
            claim.subjectType === "artist"
              ? artistPath({ slug: claim.subjectSlug })
              : venuePath({ slug: claim.subjectSlug });

          return (
            <li key={claim.id} className="border-b border-line py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <LocaleLink
                      href={href}
                      className="font-display text-lg font-semibold hover:text-cyan"
                    >
                      {claim.subjectName}
                    </LocaleLink>
                    <span className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                      {claim.subjectType === "artist" ? dict.kindArtist : dict.kindVenue}
                    </span>
                    {claim.verified ? (
                      <VerifiedBadge label={dict.claimVerified} />
                    ) : (
                      <span className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                        {dict.claimNotVerified}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 font-mono text-[10px] tracking-[0.08em] text-muted">
                    {claim.email ?? dict.unknownEmail} · {date.format(new Date(claim.createdAt))}
                  </p>

                  <p className="mt-2 text-xs text-muted">
                    <span>{dict.proof}: </span>
                    <a
                      href={claim.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-cyan hover:opacity-80"
                    >
                      {claim.proofUrl}
                    </a>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!claim.verified ? (
                    <button
                      type="button"
                      disabled={busy === claim.id}
                      onClick={() => void verify(claim)}
                      className="inline-flex min-h-11 items-center border border-cyan/50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-50"
                    >
                      {busy === claim.id ? dict.working : dict.verify}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(openId === claim.id ? null : claim.id);
                      setNote("");
                      setError(null);
                      setNotice(null);
                    }}
                    className="inline-flex min-h-11 items-center border border-pink/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-pink transition-colors hover:bg-pink/10"
                  >
                    {dict.claimRevoke}
                  </button>
                </div>
              </div>

              {openId === claim.id ? (
                <div className="mt-4 border border-line bg-white/[0.03] p-3">
                  <label
                    htmlFor={`revoke-note-${claim.id}`}
                    className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
                  >
                    {dict.claimRevokeNote}
                  </label>
                  <textarea
                    id={`revoke-note-${claim.id}`}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder={dict.claimRevokePlaceholder}
                    className="mt-2 w-full border border-line bg-surface px-3 py-2 text-sm text-white outline-none focus:border-cyan/60"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === claim.id}
                      onClick={() => void revoke(claim)}
                      className="inline-flex min-h-11 items-center border border-pink/60 bg-pink/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-pink/20 disabled:opacity-50"
                    >
                      {busy === claim.id ? dict.working : dict.claimRevoke}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenId(null)}
                      className="inline-flex min-h-11 items-center px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white"
                    >
                      {dict.moderationCancel}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
        </ul>
      )}
    </div>
  );
}
