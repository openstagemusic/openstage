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
  isAuthenticated,
  dict,
}: {
  subjectType: "artist" | "venue";
  subjectId: string;
  initialFollowing: boolean;
  isAuthenticated: boolean;
  dict: Dictionary["follow"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <LocaleLink
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className="inline-flex min-h-11 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
      >
        {dict.login}
      </LocaleLink>
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
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col gap-1">
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
      {error ? <span className="text-[10px] text-pink">{error}</span> : null}
    </span>
  );
}
