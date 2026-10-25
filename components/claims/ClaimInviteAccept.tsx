"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { acceptClaimInviteAction } from "@/app/actions/claims";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { artistPath, venuePath } from "@/lib/events/paths";
import { withLocale } from "@/lib/i18n/locale-path";

export default function ClaimInviteAccept({
  token,
  dict,
}: {
  token: string;
  dict: Dictionary["claims"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    startTransition(async () => {
      const outcome = await acceptClaimInviteAction({ token });

      if (!outcome.ok || !outcome.subjectType || !outcome.slug) {
        setError(outcome.error ?? dict.inviteError);
        return;
      }

      const path =
        outcome.subjectType === "artist"
          ? artistPath({ slug: outcome.slug })
          : venuePath({ slug: outcome.slug });

      router.push(withLocale(locale, path));
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={accept}
        className="inline-flex min-h-11 items-center justify-center border border-violet-strong bg-violet-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
      >
        {pending ? dict.inviteAccepting : dict.inviteAccept}
      </button>

      {error ? (
        <p role="alert" className="mt-4 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      ) : null}
    </div>
  );
}
