"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  decideClaimAction,
  publishEventAction,
  revokeClaimAction,
  setProfileVerifiedAction,
  type ClaimActionResult,
} from "@/app/actions/claims";
import LocaleLink from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { ClaimRecord, DraftEvent, VerifiedProfile } from "@/lib/claims/queries";
import { eventPath, artistPath, venuePath } from "@/lib/events/paths";

type AdminQueueProps = {
  pending: ClaimRecord[];
  toVerify: ClaimRecord[];
  verified: VerifiedProfile[];
  drafts: DraftEvent[];
  dict: Dictionary["admin"];
};

const primaryButton =
  "rounded-full bg-violet px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const ghostButton =
  "rounded-full border border-white/15 px-3 py-1.5 text-xs text-muted transition-colors hover:text-white disabled:opacity-50";

/**
 * Le quattro code dell'admin. Ogni pulsante chiama una funzione del database,
 * che rifà da capo i controlli: qui non c'è nessuna scorciatoia.
 */
export default function AdminQueue({
  pending,
  toVerify,
  verified,
  drafts,
  dict,
}: AdminQueueProps) {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const data = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });

  async function run(key: string, action: () => Promise<ClaimActionResult>) {
    setBusy(key);
    setError(null);

    const outcome = await action();

    setBusy(null);

    if (!outcome.ok) {
      setError(outcome.error ?? dict.errorGeneric);
      return;
    }

    router.refresh();
  }

  const empty = <p className="mt-3 text-sm text-muted">{dict.empty}</p>;

  return (
    <div className="space-y-10">
      {error ? (
        <p className="rounded-2xl border border-pink/40 bg-pink/10 p-4 text-sm text-white">{error}</p>
      ) : null}

      {/* Richieste di reclamo di un locale */}
      <section>
        <h2 className="font-display text-xl font-semibold">
          {dict.pendingTitle} <span className="text-muted">({pending.length})</span>
        </h2>
        <p className="mt-1 text-sm text-muted">{dict.pendingText}</p>

        {pending.length === 0
          ? empty
          : pending.map((claim) => {
              const subject = claim.subjectType === "artist" ? artistPath({ slug: claim.subjectSlug }) : venuePath({ slug: claim.subjectSlug });

              return (
                <article
                  key={claim.id}
                  className="glass mt-4 rounded-2xl border border-white/10 p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-semibold">
                      {claim.subjectType === "artist" ? dict.kindArtist : dict.kindVenue}:{" "}
                      <LocaleLink href={subject} className="text-cyan hover:opacity-80">
                        {claim.subjectName}
                      </LocaleLink>
                    </h3>
                    <span className="text-xs text-muted">{data.format(new Date(claim.createdAt))}</span>
                  </div>

                  <p className="mt-1 text-xs text-muted">{claim.email ?? dict.unknownEmail}</p>

                  <p className="mt-2 text-xs">
                    <span className="text-muted">{dict.proof}: </span>
                    <a
                      href={claim.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-cyan hover:opacity-80"
                    >
                      {claim.proofUrl}
                    </a>
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        run(`approve-${claim.id}`, () =>
                          decideClaimAction({ claimId: claim.id, approve: true })
                        )
                      }
                      className={primaryButton}
                    >
                      {busy === `approve-${claim.id}` ? dict.working : dict.approve}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        run(`reject-${claim.id}`, () =>
                          decideClaimAction({ claimId: claim.id, approve: false })
                        )
                      }
                      className={ghostButton}
                    >
                      {busy === `reject-${claim.id}` ? dict.working : dict.reject}
                    </button>
                  </div>
                </article>
              );
            })}
      </section>

      {/* Schede reclamate, in attesa di verifica */}
      <section>
        <h2 className="font-display text-xl font-semibold">
          {dict.verifyTitle} <span className="text-muted">({toVerify.length})</span>
        </h2>
        <p className="mt-1 text-sm text-muted">{dict.verifyText}</p>

        {toVerify.length === 0
          ? empty
          : toVerify.map((claim) => {
              const subject = claim.subjectType === "artist" ? artistPath({ slug: claim.subjectSlug }) : venuePath({ slug: claim.subjectSlug });

              return (
                <article key={claim.id} className="glass mt-4 rounded-2xl border border-white/10 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-semibold">
                      <LocaleLink href={subject} className="text-cyan hover:opacity-80">
                        {claim.subjectName}
                      </LocaleLink>
                    </h3>
                    <span className="text-xs text-muted">{data.format(new Date(claim.createdAt))}</span>
                  </div>

                  <p className="mt-1 text-xs text-muted">{claim.email ?? dict.unknownEmail}</p>

                  <p className="mt-2 text-xs">
                    <span className="text-muted">{dict.proof}: </span>
                    <a
                      href={claim.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-cyan hover:opacity-80"
                    >
                      {claim.proofUrl}
                    </a>
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        run(`verify-${claim.id}`, () =>
                          setProfileVerifiedAction({ profileId: claim.profileId, verified: true })
                        )
                      }
                      className={primaryButton}
                    >
                      {busy === `verify-${claim.id}` ? dict.working : dict.verify}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => run(`revoke-${claim.id}`, () => revokeClaimAction({ claimId: claim.id }))}
                      className={ghostButton}
                    >
                      {busy === `revoke-${claim.id}` ? dict.working : dict.revoke}
                    </button>
                  </div>
                </article>
              );
            })}
      </section>

      {/* Eventi in bozza */}
      <section>
        <h2 className="font-display text-xl font-semibold">
          {dict.draftsTitle} <span className="text-muted">({drafts.length})</span>
        </h2>
        <p className="mt-1 text-sm text-muted">{dict.draftsText}</p>

        {drafts.length === 0
          ? empty
          : drafts.map((event) => (
              <article key={event.id} className="glass mt-4 rounded-2xl border border-white/10 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-semibold">{event.title}</h3>
                  <span className="text-xs text-muted">
                    {data.format(new Date(event.startsAt))}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted">
                  {[event.artistName, event.venueName, event.city].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-xs text-muted">{event.authorEmail ?? dict.unknownEmail}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => run(`publish-${event.id}`, () => publishEventAction(event.id))}
                    className={primaryButton}
                  >
                    {busy === `publish-${event.id}` ? dict.working : dict.publish}
                  </button>
                  <LocaleLink
                    href={eventPath({ id: event.id, slug: event.slug, city: event.city })}
                    className={ghostButton}
                  >
                    {dict.openEvent}
                  </LocaleLink>
                </div>
              </article>
            ))}
      </section>

      {/* Profili verificati */}
      <section>
        <h2 className="font-display text-xl font-semibold">
          {dict.verifiedTitle} <span className="text-muted">({verified.length})</span>
        </h2>
        <p className="mt-1 text-sm text-muted">{dict.verifiedText}</p>

        {verified.length === 0 ? (
          empty
        ) : (
          <ul className="mt-4 space-y-2">
            {verified.map((profile) => (
              <li
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="text-sm">{profile.email ?? dict.unknownEmail}</span>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run(`unverify-${profile.id}`, () =>
                      setProfileVerifiedAction({ profileId: profile.id, verified: false })
                    )
                  }
                  className={ghostButton}
                >
                  {busy === `unverify-${profile.id}` ? dict.working : dict.unverify}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
