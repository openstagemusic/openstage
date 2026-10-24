"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Link from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { withLocale } from "@/lib/i18n/locale-path";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

import {
  authErrorClass,
  authInputClass,
  authLabelClass,
  authNoticeClass,
  authPrimaryButtonClass,
} from "./formStyles";

type SessionState = "checking" | "ready" | "missing";

export default function ResetPasswordForm({ dict }: { dict: Dictionary["auth"] }) {
  const router = useRouter();
  const locale = useLocale();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>("checking");

  const configured = isSupabaseConfigured();

  // Il link di recovery di Supabase arriva con i token nel fragment/query.
  // `createBrowserClient` li legge e crea la sessione: qui aspettiamo che
  // finisca, invece di rimandare subito al login.
  useEffect(() => {
    if (!configured) return;

    const supabase = createClient();
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setSessionState((state) => (state === "checking" ? "missing" : state));
      }
    }, 2500);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) setSessionState("ready");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setSessionState("ready");
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [configured]);

  if (!configured) {
    return (
      <p className="mt-6 border-l-2 border-line-strong bg-white/[0.03] px-3 py-3 text-sm text-muted">
        {dict.notConfigured}
      </p>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 8) {
      setError(dict.resetTooShort);
      return;
    }

    if (password !== confirm) {
      setError(dict.resetMismatch);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(dict.resetSessionMissing);
      return;
    }

    setNotice(dict.resetSuccess);
    setPassword("");
    setConfirm("");
    setTimeout(() => {
      router.push(withLocale(locale, "/login"));
      router.refresh();
    }, 1200);
  }

  if (sessionState === "checking") {
    return (
      <p role="status" className={`${authNoticeClass} mt-6`}>
        {dict.resetChecking}
      </p>
    );
  }

  if (sessionState === "missing") {
    return (
      <div className="mt-6 space-y-4">
        <p role="alert" className={authErrorClass}>
          {dict.resetSessionMissing}
        </p>
        <Link href="/forgot-password" className="text-sm text-cyan hover:underline">
          {dict.forgotPassword}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-5">
      <div>
        <label htmlFor="new-password" className={authLabelClass}>
          {dict.newPassword}
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={authInputClass}
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className={authLabelClass}>
          {dict.confirmPassword}
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={authInputClass}
        />
      </div>

      {error ? (
        <p role="alert" aria-live="polite" className={authErrorClass}>
          {error}
        </p>
      ) : null}

      {notice ? (
        <p role="status" className={authNoticeClass}>
          {notice}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
        {loading ? dict.resetSaving : dict.resetSubmit}
      </button>
    </form>
  );
}
