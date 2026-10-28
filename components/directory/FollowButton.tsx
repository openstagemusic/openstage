"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { toggleFollowAction } from "@/app/actions/follows";
import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";

export default function FollowButton({
  subjectType,
  subjectId,
  initialFollowing,
  initialFollowers,
  isAuthenticated,
  isOwnPage = false,
  dict,
}: {
  subjectType: "artist" | "venue";
  subjectId: string;
  initialFollowing: boolean;
  /** Totale pubblico dei follower, calcolato dal database. */
  initialFollowers: number;
  isAuthenticated: boolean;
  /** Sulla propria scheda il pulsante non ha senso, il numero sì. */
  isOwnPage?: boolean;
  dict: Dictionary["follow"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(initialFollowing);
  const [followers, setFollowers] = useState(initialFollowers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Il numero arriva dal server e viene corretto subito dopo il click, senza
  // aspettare il refresh della pagina. Se è zero non mostriamo nulla: una
  // scheda nuova non deve sembrare vuota o inutile.
  function countLabel() {
    if (followers <= 0) return null;
    const text =
      followers === 1
        ? `${followers} ${dict.followerOne}`
        : `${followers} ${dict.followerMany}`;

    return (
      <span aria-live="polite" className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {text}
      </span>
    );
  }

  if (isOwnPage) {
    return countLabel();
  }

  if (!isAuthenticated) {
    return (
      <span className="inline-flex flex-wrap items-center gap-3">
        <LocaleLink
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
        >
          {dict.login}
        </LocaleLink>
        {countLabel()}
      </span>
    );
  }

  async function toggle() {
    setBusy(true);
    setError(null);

    const outcome = await toggleFollowAction({ subjectType, subjectId });
    setBusy(false);

    if (!outcome.ok) {
      setError(outcome.error === "own" ? dict.own : dict.error);
      return;
    }

    setFollowing(outcome.following);
    setFollowers((current) =>
      outcome.following ? current + 1 : Math.max(0, current - 1)
    );
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          aria-pressed={following}
          onClick={() => void toggle()}
          className={
            following
              ? "inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white disabled:opacity-50"
              : "inline-flex min-h-11 items-center border border-violet-strong bg-violet-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
          }
        >
          {busy ? dict.saving : following ? dict.following : dict.follow}
        </button>
        {countLabel()}
      </span>
      {error ? <span className="text-[10px] text-pink">{error}</span> : null}
    </span>
  );
}
