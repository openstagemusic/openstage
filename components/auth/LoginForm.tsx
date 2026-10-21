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

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-violet/60";

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
      <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
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
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-muted">
          {dict.email}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-muted">
          {dict.password}
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      {siteKey ? <TurnstileWidget siteKey={siteKey} onToken={setToken} /> : null}

      {error ? <p className="text-sm text-pink">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-violet-strong px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? dict.loading : dict.loginSubmit}
      </button>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-white/10" />
        {dict.orContinueWith}
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <GoogleButton label={dict.google} />
    </form>
  );
}
