"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  grantProAction,
  revokeProAction,
  updateProRequestStatusAction,
} from "@/app/actions/pro";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AdminProEntitlement, AdminProRequest } from "@/lib/pro/queries";

const inputClass =
  "mt-2 w-full border border-line bg-bg px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-cyan";
const labelClass = "font-mono text-[9px] uppercase tracking-[0.14em] text-muted";

export default function AdminProPanel({
  requests,
  entitlements,
  dict,
  pro,
  locale,
}: {
  requests: AdminProRequest[];
  entitlements: AdminProEntitlement[];
  dict: Dictionary["admin"];
  pro: Dictionary["pro"];
  locale: "it" | "en";
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"artist" | "venue">("artist");
  const [months, setMonths] = useState(12);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
  });

  const accessLabel = (item: AdminProEntitlement) => {
    if (item.status === "revoked") return dict.proAccessRevoked;
    if (item.status === "refunded") return dict.proAccessRefunded;
    if (item.active) return dict.proAccessActive;
    return dict.proAccessExpired;
  };

  const statusLabel = (status: AdminProRequest["status"]) => {
    if (status === "reviewing") return pro.statusReviewing;
    if (status === "planned") return pro.statusPlanned;
    if (status === "released") return pro.statusReleased;
    if (status === "declined") return pro.statusDeclined;
    return pro.statusNew;
  };

  async function grant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("grant");
    setNotice(null);
    setError(null);

    const outcome = await grantProAction({ email, plan, months });
    setBusy(null);

    if (!outcome.ok) {
      setError(
        outcome.error === "not_found"
          ? dict.proGrantNotFound
          : outcome.error === "role"
            ? dict.proGrantRole
            : dict.proGrantError
      );
      return;
    }

    setNotice(dict.proGrantSuccess);
    setEmail("");
    router.refresh();
  }

  async function updateStatus(id: string, status: string) {
    setBusy(id);
    setNotice(null);
    setError(null);
    const outcome = await updateProRequestStatusAction({ id, status });
    setBusy(null);

    if (!outcome.ok) {
      setError(dict.proRequestError);
      return;
    }
    setNotice(dict.proRequestUpdated);
    router.refresh();
  }

  async function revoke(id: string) {
    setBusy(id);
    setNotice(null);
    setError(null);
    const outcome = await revokeProAction({ id });
    setBusy(null);

    if (!outcome.ok) {
      setError(dict.proRequestError);
      return;
    }
    setNotice(dict.proRevokedOk);
    router.refresh();
  }

  return (
    <div className="mt-8">
      {notice ? (
        <p role="status" className="mb-4 border-l-2 border-cyan bg-cyan/10 px-3 py-2 text-xs text-white">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-4 border-l-2 border-pink bg-pink/10 px-3 py-2 text-xs text-white">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
          {dict.proGrantTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{dict.proGrantText}</p>

        <form onSubmit={grant} className="mt-4 grid gap-4 border border-line bg-surface/40 p-4 sm:grid-cols-[1.4fr_0.8fr_0.5fr_auto] sm:items-end">
          <div>
            <label htmlFor="pro-email" className={labelClass}>
              {dict.proGrantEmail}
            </label>
            <input
              id="pro-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="pro-plan" className={labelClass}>
              {dict.proGrantPlan}
            </label>
            <select
              id="pro-plan"
              value={plan}
              onChange={(event) => setPlan(event.target.value as "artist" | "venue")}
              className={inputClass}
            >
              <option value="artist">{pro.plans.artist}</option>
              <option value="venue">{pro.plans.venue}</option>
            </select>
          </div>
          <div>
            <label htmlFor="pro-months" className={labelClass}>
              {dict.proGrantMonths}
            </label>
            <input
              id="pro-months"
              type="number"
              min={1}
              max={24}
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={busy === "grant"}
            className="inline-flex min-h-10 items-center justify-center bg-violet-strong px-4 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
          >
            {dict.proGrantCta}
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
          {dict.proAccessesTitle} · {entitlements.length}
        </h2>

        {entitlements.length > 0 ? (
          <ul className="mt-3 border-t border-line">
            {entitlements.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
                <div>
                  <p className="text-sm text-white">
                    {item.email ?? item.profileId}
                    <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                      {pro.plans[item.plan]} · {dict.proSourceManual}
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                    {date.format(new Date(item.validUntil))}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={
                      item.active
                        ? "border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan"
                        : "border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
                    }
                  >
                    {accessLabel(item)}
                  </span>
                  {item.status === "active" ? (
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => void revoke(item.id)}
                      className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-pink disabled:opacity-50"
                    >
                      {dict.proRevoke}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 border-l-2 border-line-strong pl-3 text-sm text-muted">
            {dict.proAccessesEmpty}
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
          {dict.proRequestsTitle} · {requests.length}
        </h2>

        {requests.length > 0 ? (
          <ul className="mt-3 border-t border-line">
            {requests.map((item) => (
              <li key={item.id} className="border-b border-line py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-white">{item.title}</p>
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                    {pro.areas[item.area as keyof typeof pro.areas] ?? item.area} ·{" "}
                    {date.format(new Date(item.createdAt))}
                  </span>
                </div>

                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                  {item.email ?? item.profileId}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.problem}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.useCase}</p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-cyan">
                    {statusLabel(item.status)}
                  </span>
                  <label htmlFor={`status-${item.id}`} className="sr-only">
                    {dict.proRequestsTitle}
                  </label>
                  <select
                    id={`status-${item.id}`}
                    value={item.status}
                    disabled={busy === item.id}
                    onChange={(event) => void updateStatus(item.id, event.target.value)}
                    className="border border-line bg-bg px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted outline-none focus:border-cyan disabled:opacity-50"
                  >
                    <option value="new">{pro.statusNew}</option>
                    <option value="reviewing">{pro.statusReviewing}</option>
                    <option value="planned">{pro.statusPlanned}</option>
                    <option value="released">{pro.statusReleased}</option>
                    <option value="declined">{pro.statusDeclined}</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 border-l-2 border-line-strong pl-3 text-sm text-muted">
            {dict.proRequestsEmpty}
          </p>
        )}
      </section>
    </div>
  );
}
