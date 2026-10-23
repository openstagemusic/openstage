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

export default function OnboardingForm({ dict }: { dict: Dictionary["onboarding"] }) {
  const router = useRouter();
  const locale = useLocale();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [genre, setGenre] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
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

    const { error: insertError } = await supabase.from("artists").insert({
      profile_id: user.id,
      name,
      city: city || null,
      genre: genre || null,
      spotify_url: spotifyUrl || null,
    });

    if (insertError) {
      setLoading(false);
      setError(insertError.message);
      return;
    }

    router.push(withLocale(locale, "/events/new"));
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="city" className={authLabelClass}>
            {dict.city}
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="genre" className={authLabelClass}>
            {dict.genre}
          </label>
          <select
            id="genre"
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            className={authInputClass}
          >
            <option value="">{dict.genrePlaceholder}</option>
            {dict.genres.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="spotifyUrl" className={authLabelClass}>
          {dict.spotifyUrl}
        </label>
        <input
          id="spotifyUrl"
          type="url"
          placeholder="https://open.spotify.com/artist/..."
          value={spotifyUrl}
          onChange={(event) => setSpotifyUrl(event.target.value)}
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
