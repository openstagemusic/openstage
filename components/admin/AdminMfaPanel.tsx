"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Dictionary } from "@/i18n/dictionaries/en";
import { createClient } from "@/lib/supabase/client";

type EnrollData = {
  id: string;
  qr: string;
  secret: string;
};

export default function AdminMfaPanel({
  factorId,
  aal2,
  dict,
}: {
  factorId: string | null;
  aal2: boolean;
  dict: Dictionary["admin"];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enroll, setEnroll] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(aal2);
  const [disabled, setDisabled] = useState(false);

  function verify(currentFactorId: string) {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const challenge = await supabase.auth.mfa.challenge({ factorId: currentFactorId });

      if (challenge.error || !challenge.data) {
        setError(dict.mfaError);
        return;
      }

      const result = await supabase.auth.mfa.verify({
        factorId: currentFactorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });

      if (result.error) {
        setError(dict.mfaError);
        return;
      }

      setDone(true);
      setCode("");
      router.push("/admin");
      router.refresh();
    });
  }

  function disable(currentFactorId: string) {
    if (!window.confirm(dict.mfaDisableConfirm)) return;

    setError(null);
    setNotice(null);
    startTransition(async () => {
      const supabase = createClient();
      const result = await supabase.auth.mfa.unenroll({ factorId: currentFactorId });

      if (result.error) {
        setError(dict.mfaDisableFailed);
        return;
      }

      setDone(false);
      setDisabled(true);
      setNotice(dict.mfaDisabled);
      router.refresh();
    });
  }

  function startEnroll() {
    setError(null);
    setNotice(null);
    setDisabled(false);
    startTransition(async () => {
      const supabase = createClient();
      const result = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "OpenStage admin",
      });

      if (result.error || !result.data) {
        setError(dict.mfaError);
        return;
      }

      setEnroll({
        id: result.data.id,
        qr: result.data.totp.qr_code,
        secret: result.data.totp.secret,
      });
    });
  }

  if (done) {
    return (
      <div>
        <p className="border-l-2 border-cyan bg-cyan/10 px-4 py-3 text-sm text-white">
          {dict.mfaEnrolled}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              router.push("/admin");
              router.refresh();
            }}
            className="inline-flex min-h-11 items-center border border-violet-strong bg-violet-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {dict.mfaBack}
          </button>
          {factorId ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => disable(factorId)}
              className="inline-flex min-h-11 items-center border border-pink/50 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-pink transition-colors hover:bg-pink/10 disabled:opacity-50"
            >
              {dict.mfaDisable}
            </button>
          ) : null}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">{dict.mfaDisableHint}</p>
        {error ? (
          <p role="alert" className="mt-4 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const activeFactor = disabled ? null : (enroll?.id ?? factorId);

  return (
    <div className="max-w-2xl">
      {notice ? (
        <p className="mb-4 border-l-2 border-cyan bg-cyan/10 px-4 py-3 text-sm text-white">
          {notice}
        </p>
      ) : null}

      {!activeFactor ? (
        <>
          <p className="text-sm leading-relaxed text-muted">{dict.mfaEnrollHint}</p>
          <button
            type="button"
            disabled={pending}
            onClick={startEnroll}
            className="mt-6 inline-flex min-h-11 items-center border border-violet-strong bg-violet-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
          >
            {dict.mfaEnroll}
          </button>
        </>
      ) : (
        <>
          {enroll ? (
            <div className="border border-line bg-surface/60 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
                {dict.mfaFactor}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-start">
                {/* eslint-disable-next-line @next/next/no-img-element -- QR generato da Supabase */}
                <img
                  src={`data:image/svg+xml;utf-8,${encodeURIComponent(enroll.qr)}`}
                  alt="QR 2FA"
                  className="h-48 w-48 border border-line bg-white p-2"
                />
                <div>
                  <p className="text-sm leading-relaxed text-muted">{dict.mfaEnrollHint}</p>
                  <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {dict.mfaSecret}
                  </p>
                  <code className="mt-1 block break-all border border-line bg-bg px-3 py-2 text-xs text-white">
                    {enroll.secret}
                  </code>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <label
              htmlFor="mfa-code"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
            >
              {dict.mfaCode}
            </label>
            <input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 w-full max-w-xs border border-line bg-surface px-4 py-3 font-mono text-lg tracking-[0.3em] text-white outline-none focus:border-cyan"
            />
            <button
              type="button"
              disabled={pending || code.length !== 6}
              onClick={() => verify(activeFactor)}
              className="mt-4 inline-flex min-h-11 items-center border border-violet-strong bg-violet-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
            >
              {pending ? dict.mfaVerifying : dict.mfaVerify}
            </button>
          </div>
        </>
      )}

      {error ? (
        <p role="alert" className="mt-5 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      ) : null}
    </div>
  );
}
