"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { revokeClaimAction } from "@/app/actions/claims";
import LocaleLink from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { ClaimRecord } from "@/lib/claims/queries";
import { artistPath, venuePath } from "@/lib/events/paths";

export default function AdminClaimsPanel({
  claims,
  dict,
}: {
  claims: ClaimRecord[];
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

  if (claims.length === 0) {
    return <p className="mt-5 border-l-2 border-line-strong pl-3 text-sm text-muted">{dict.claimsEmpty}</p>;
  }

  return (
    <div className="mt-6">
      {notice ? (
        <p className="mb-4 border-l-2 border-cyan bg-cyan/10 px-4 py-3 text-sm text-white">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      ) : null}

      <ul className="border-t border-line">
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
                    <span
                      className={
                        claim.verified
                          ? "border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white"
                          : "border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
                      }
                    >
                      {claim.verified ? dict.claimVerified : dict.claimNotVerified}
                    </span>
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
    </div>
  );
}
