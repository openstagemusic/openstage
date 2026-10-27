"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { withLocale } from "@/lib/i18n/locale-path";
import { createClient } from "@/lib/supabase/client";

import {
  authErrorClass,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "./formStyles";

/**
 * Prima scheda dell'artista: basta il nome.
 *
 * Il resto (città, genere, Spotify, bio) si completa dal pannello profilo, dove
 * si può correggere con calma. Il pulsante quindi porta a `/account`, non alla
 * pagina pubblica: la scheda è appena nata e va rifinita.
 */
export default function OnboardingForm({ dict }: { dict: Dictionary["onboarding"] }) {
  const router = useRouter();
  const locale = useLocale();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError(dict.sessionExpired);
      return;
    }

    const { error: insertError } = await supabase
      .from("artists")
      .insert({ profile_id: user.id, name })
      .select("id")
      .single();

    if (insertError) {
      setLoading(false);
      setError(insertError.message);
      return;
    }

    router.push(withLocale(locale, "/account"));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div>
        <label htmlFor="name" className={authLabelClass}>
          {dict.name}
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={authInputClass}
        />
      </div>

      {error ? (
        <p role="alert" aria-live="polite" className={authErrorClass}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
        {loading ? dict.saving : dict.submit}
      </button>
    </form>
  );
}
