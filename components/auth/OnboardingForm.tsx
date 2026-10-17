"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { withLocale } from "@/lib/i18n/locale-path";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-violet/60";

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
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-muted">
          {dict.name}
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="city" className="mb-1 block text-sm text-muted">
          {dict.city}
        </label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="genre" className="mb-1 block text-sm text-muted">
          {dict.genre}
        </label>
        <select
          id="genre"
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
          className={inputClass}
        >
          <option value="">{dict.genrePlaceholder}</option>
          {dict.genres.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="spotifyUrl" className="mb-1 block text-sm text-muted">
          {dict.spotifyUrl}
        </label>
        <input
          id="spotifyUrl"
          type="url"
          placeholder="https://open.spotify.com/artist/..."
          value={spotifyUrl}
          onChange={(event) => setSpotifyUrl(event.target.value)}
          className={inputClass}
        />
      </div>

      {error ? <p className="text-sm text-pink">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-violet to-cyan px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? dict.saving : dict.submit}
      </button>
    </form>
  );
}
