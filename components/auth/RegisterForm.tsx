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

type Role = "fan" | "artist" | "venue";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-violet/60";

export default function RegisterForm({ dict }: { dict: Dictionary["auth"] }) {
  const router = useRouter();
  const locale = useLocale();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("fan");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
        data: { full_name: fullName, role },
        captchaToken: token || undefined,
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(authErrorMessage(signUpError.message, dict));
      return;
    }

    if (!data.session) {
      // Quando l'email esiste già, Supabase risponde "a vuoto" per non rivelare chi è
      // iscritto: nessun errore, nessuna email inviata e nessuna identità collegata.
      // Senza questo controllo si direbbe "controlla la tua email" a chi aspetta un'email
      // che non arriverà mai.
      if ((data.user?.identities?.length ?? 0) === 0) {
        setError(dict.errors.alreadyRegistered);
        return;
      }

      setNotice(dict.checkEmail);
      return;
    }

    router.push(
      withLocale(
        locale,
        role === "artist" ? "/onboarding/artist" : role === "venue" ? "/onboarding/venue" : "/"
      )
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="fullName" className="mb-1 block text-sm text-muted">
          {dict.fullName}
        </label>
        <input
          id="fullName"
          type="text"
          required
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className={inputClass}
        />
      </div>

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
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="role" className="mb-1 block text-sm text-muted">
          {dict.role}
        </label>
        <select
          id="role"
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          className={inputClass}
        >
          <option value="fan">{dict.roleFan}</option>
          <option value="artist">{dict.roleArtist}</option>
          <option value="venue">{dict.roleVenue}</option>
        </select>
      </div>

      {siteKey ? <TurnstileWidget siteKey={siteKey} onToken={setToken} /> : null}

      {error ? <p className="text-sm text-pink">{error}</p> : null}
      {notice ? <p className="text-sm text-cyan">{notice}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-violet-strong px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? dict.loading : dict.registerSubmit}
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
