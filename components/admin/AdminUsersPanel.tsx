"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setUserSuspendedAction } from "@/app/actions/admin";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AdminUser } from "@/lib/admin/queries";
import type { UserRole } from "@/lib/auth/roles";

export default function AdminUsersPanel({
  users,
  roleLabels,
  dict,
}: {
  users: AdminUser[];
  roleLabels: Record<UserRole, string>;
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

  async function toggle(user: AdminUser) {
    const suspending = user.suspendedAt === null;
    if (!window.confirm(suspending ? dict.userSuspendConfirm : dict.userRestoreConfirm)) return;

    setBusy(user.id);
    setError(null);
    setNotice(null);

    const outcome = await setUserSuspendedAction({
      profileId: user.id,
      suspended: suspending,
    });

    setBusy(null);

    if (!outcome.ok) {
      setError(dict.userActionFailed);
      return;
    }

    setNotice(suspending ? dict.userSuspendedNotice : dict.userRestoredNotice);
    router.refresh();
  }

  if (users.length === 0) {
    return <p className="mt-5 border-l-2 border-line-strong pl-3 text-sm text-muted">{dict.usersEmpty}</p>;
  }

  return (
    <div className="mt-6">
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

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              <th className="px-3 py-2 font-normal">Email</th>
              <th className="px-3 py-2 font-normal">{dict.userCards}</th>
              <th className="px-3 py-2 font-normal">{dict.userJoined}</th>
              <th className="px-3 py-2 font-normal">{dict.statusLabel}</th>
              <th className="px-3 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const suspended = user.suspendedAt !== null;
              const card = user.artist ?? user.venue;

              return (
                <tr key={user.id} className="border-b border-line/60 align-top">
                  <td className="px-3 py-3">
                    <p className="break-all text-white">{user.email ?? "—"}</p>
                    <p className="mt-1 text-xs text-muted">
                      {user.fullName ?? "—"} · {roleLabels[user.role]}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">
                    {card ? (
                      <>
                        <p className="text-white">{card.name}</p>
                        <p className="mt-0.5">{user.artist ? dict.nav.artists : dict.nav.venues}</p>
                      </>
                    ) : (
                      dict.userNoCard
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">
                    {date.format(new Date(user.createdAt))}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={
                          suspended
                            ? "border border-pink/50 bg-pink/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-pink"
                            : "border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white"
                        }
                      >
                        {suspended ? dict.userSuspended : dict.userActive}
                      </span>
                      {user.role === "artist" || user.role === "venue" ? (
                        <span className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                          {user.verifiedAt ? dict.userVerified : dict.userNotVerified}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {user.role === "admin" ? null : (
                      <button
                        type="button"
                        disabled={busy === user.id}
                        onClick={() => void toggle(user)}
                        className={
                          suspended
                            ? "inline-flex min-h-9 items-center border border-cyan/50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-50"
                            : "inline-flex min-h-9 items-center border border-pink/50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-pink transition-colors hover:bg-pink/10 disabled:opacity-50"
                        }
                      >
                        {busy === user.id
                          ? dict.working
                          : suspended
                            ? dict.userRestore
                            : dict.userSuspend}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
