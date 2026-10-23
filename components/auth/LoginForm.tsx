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

export default function LoginForm({
  dict,
  nextPath,
}: {
  dict: Dictionary["auth"];
  /** Pagina interna su cui tornare dopo l'accesso (es. l'evento da salvare). */
  nextPath?: string | null;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const configured = isSupabaseConfigured();

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

    if (siteKey && !token) {
      setError(dict.captchaRequired);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: token || undefined },
    });
    setLoading(false);

    if (signInError) {
      setError(authErrorMessage(signInError.message, dict));
      return;
    }

    router.push(withLocale(locale, nextPath ?? "/"));
    router.refresh();
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

      <div>
        <label htmlFor="password" className={authLabelClass}>
          {dict.password}
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={authInputClass}
        />
      </div>

      {siteKey ? (
        <div className="min-h-[65px] overflow-hidden">
          <TurnstileWidget siteKey={siteKey} onToken={setToken} />
        </div>
      ) : null}

      {error ? (
        <p role="alert" aria-live="polite" className={authErrorClass}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
        {loading ? dict.loading : dict.loginSubmit}
      </button>

      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        <span className="h-px flex-1 bg-line" />
        {dict.orContinueWith}
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton label={dict.google} />
    </form>
  );
}
