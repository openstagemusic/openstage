"use client";

import { useState } from "react";

import Link from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { authErrorMessage } from "@/lib/auth/error-messages";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

import TurnstileWidget from "./TurnstileWidget";
import {
  authErrorClass,
  authInputClass,
  authLabelClass,
  authNoticeClass,
  authPrimaryButtonClass,
} from "./formStyles";

export default function ForgotPasswordForm({ dict }: { dict: Dictionary["auth"] }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const configured = isSupabaseConfigured();

  function resetCaptcha() {
    setToken("");
    setCaptchaReset((value) => value + 1);
  }

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
    setSent(false);

    if (siteKey && !token) {
      setError(dict.captchaRequired);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken: token || undefined,
    });
    setLoading(false);

    if (resetError) {
      setError(authErrorMessage(resetError.message, dict));
      resetCaptcha();
      return;
    }

    setSent(true);
    resetCaptcha();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-5">
      <div>
        <label htmlFor="email" className={authLabelClass}>
          {dict.email}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={authInputClass}
        />
      </div>

      {siteKey ? (
        <div className="min-h-[65px] overflow-hidden">
          <TurnstileWidget
            siteKey={siteKey}
            onToken={setToken}
            action="reset_password"
            resetKey={captchaReset}
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" aria-live="polite" className={authErrorClass}>
          {error}
        </p>
      ) : null}

      {sent ? (
        <p role="status" className={authNoticeClass}>
          {dict.forgotSent}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
        {loading ? dict.loading : dict.forgotSubmit}
      </button>

      <p className="text-center text-xs text-muted">
        <Link href="/login" className="text-cyan hover:underline">
          {dict.backToLogin}
        </Link>
      </p>
    </form>
  );
}
