"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { authErrorMessage } from "@/lib/auth/error-messages";
import { withLocale } from "@/lib/i18n/locale-path";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

import GoogleButton from "./GoogleButton";
import TurnstileWidget from "./TurnstileWidget";
import {
  authErrorClass,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "./formStyles";

export default function RegisterForm({ dict }: { dict: Dictionary["auth"] }) {
  const router = useRouter();
  const locale = useLocale();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);

    if (siteKey && !token) {
      setError(dict.captchaRequired);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName },
        captchaToken: token || undefined,
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(authErrorMessage(signUpError.message, dict));
      resetCaptcha();
      return;
    }

    if (!data.session) {
      // Quando l'email esiste già, Supabase risponde "a vuoto" per non rivelare chi è
      // iscritto: nessun errore, nessuna email inviata e nessuna identità collegata.
      // Senza questo controllo si direbbe "controlla la tua email" a chi aspetta un'email
      // che non arriverà mai.
      if ((data.user?.identities?.length ?? 0) === 0) {
        setError(dict.errors.alreadyRegistered);
        resetCaptcha();
        return;
      }

      setFullName("");
      setEmail("");
      setPassword("");
      setNotice(dict.checkEmail);
      resetCaptcha();
      return;
    }

    router.push(withLocale(locale, "/onboarding/role"));
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
      <div>
        <label htmlFor="fullName" className={authLabelClass}>
          {dict.fullName}
        </label>
        <input
          id="fullName"
          type="text"
          required
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className={authInputClass}
        />
      </div>

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

      <div>
        <label htmlFor="password" className={authLabelClass}>
          {dict.password}
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={authInputClass}
        />
      </div>

      {siteKey ? (
        <div className="min-h-[65px] overflow-hidden">
          <TurnstileWidget
            siteKey={siteKey}
            onToken={setToken}
            action="signup"
            resetKey={captchaReset}
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" aria-live="polite" className={authErrorClass}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
        {loading ? dict.loading : dict.registerSubmit}
      </button>

      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        <span className="h-px flex-1 bg-line" />
        {dict.orContinueWith}
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton label={dict.google} />
      </form>

      {notice ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="check-email-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm border border-line bg-surface p-6 shadow-2xl shadow-black/40">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
              OpenStage
            </p>
            <h3 id="check-email-title" className="mt-2 font-display text-xl font-semibold">
              {dict.checkEmailTitle}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className={`${authPrimaryButtonClass} mt-5`}
            >
              {dict.close}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
