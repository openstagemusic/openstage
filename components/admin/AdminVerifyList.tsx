"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setProfileVerifiedAction } from "@/app/actions/claims";
import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";

export type AdminVerifyItem = {
  profileId: string;
  name: string;
  email: string | null;
  roleLabel: string;
  href?: string;
};

/**
 * La coda delle verifiche, riusata dove serve (utenti, artisti, locali).
 *
 * Verificare un profilo è ciò che gli permette di pubblicare senza revisione:
 * l'azione resta nel database, qui c'è solo il pulsante.
 */
export default function AdminVerifyList({
  items,
  dict,
}: {
  items: AdminVerifyItem[];
  dict: Dictionary["admin"];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify(profileId: string) {
    setBusy(profileId);
    setError(null);

    const outcome = await setProfileVerifiedAction({ profileId, verified: true });
    setBusy(null);

    if (!outcome.ok) {
      setError(dict.userActionFailed);
      return;
    }

    router.refresh();
  }

  return (
    <section className="mt-8 border border-line bg-surface/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">
          {dict.unverifiedTitle} <span className="text-muted">({items.length})</span>
        </h2>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{dict.unverifiedText}</p>

      {error ? (
        <p role="alert" className="mt-3 border-l-2 border-pink bg-pink/10 px-3 py-2 text-sm text-white">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{dict.empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {items.map((item) => (
            <li
              key={item.profileId}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-white">
                  {item.href ? (
                    <LocaleLink href={item.href} className="hover:text-cyan">
                      {item.name}
                    </LocaleLink>
                  ) : (
                    item.name
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {item.roleLabel} · {item.email ?? dict.unknownEmail}
                </p>
              </div>
              <button
                type="button"
                disabled={busy === item.profileId}
                onClick={() => void verify(item.profileId)}
                className="inline-flex min-h-9 items-center border border-cyan/50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-50"
              >
                {busy === item.profileId ? dict.working : dict.verify}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
