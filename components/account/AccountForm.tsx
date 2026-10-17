"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Dictionary } from "@/i18n/dictionaries/en";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-violet/60";

export type AccountArtist = {
  id: string;
  name: string;
  city: string;
  genre: string;
  spotifyUrl: string;
  bio: string;
};

export type AccountVenue = {
  id: string;
  name: string;
  city: string;
  address: string;
  website: string;
  capacity: string;
};

export type AccountSubject =
  | { kind: "artist"; values: AccountArtist }
  | { kind: "venue"; values: AccountVenue };

/**
 * Modifica dei propri dati. Scrive dal browser con la chiave pubblica: la RLS
 * permette di toccare solo la riga che è già tua, quindi la regola non dipende
 * da questo modulo.
 */
export default function AccountForm({
  subject,
  dict,
}: {
  subject: AccountSubject;
  dict: Dictionary["account"];
}) {
  const router = useRouter();
  const [values, setValues] = useState<AccountArtist | AccountVenue>(subject.values);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }) as AccountArtist | AccountVenue);
    setSaved(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    const supabase = createClient();

    const { error: updateError } =
      subject.kind === "artist"
        ? await supabase
            .from("artists")
            .update({
              name: (values as AccountArtist).name,
              city: (values as AccountArtist).city || null,
              genre: (values as AccountArtist).genre || null,
              spotify_url: (values as AccountArtist).spotifyUrl || null,
              bio: (values as AccountArtist).bio || null,
            })
            .eq("id", subject.values.id)
        : await supabase
            .from("venues")
            .update({
              name: (values as AccountVenue).name,
              city: (values as AccountVenue).city || null,
              address: (values as AccountVenue).address || null,
              website: (values as AccountVenue).website || null,
              capacity: (values as AccountVenue).capacity
                ? Number((values as AccountVenue).capacity)
                : null,
            })
            .eq("id", subject.values.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  const artist = subject.kind === "artist" ? (values as AccountArtist) : null;
  const venue = subject.kind === "venue" ? (values as AccountVenue) : null;

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-muted">
          {dict.name}
        </label>
        <input
          id="name"
          type="text"
          required
          value={values.name}
          onChange={(event) => set("name", event.target.value)}
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
          value={values.city}
          onChange={(event) => set("city", event.target.value)}
          className={inputClass}
        />
      </div>

      {artist ? (
        <>
          <div>
            <label htmlFor="genre" className="mb-1 block text-sm text-muted">
              {dict.genre}
            </label>
            <input
              id="genre"
              type="text"
              value={artist.genre}
              onChange={(event) => set("genre", event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="spotify" className="mb-1 block text-sm text-muted">
              {dict.spotifyUrl}
            </label>
            <input
              id="spotify"
              type="url"
              value={artist.spotifyUrl}
              onChange={(event) => set("spotifyUrl", event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="bio" className="mb-1 block text-sm text-muted">
              {dict.bio}
            </label>
            <textarea
              id="bio"
              rows={5}
              value={artist.bio}
              onChange={(event) => set("bio", event.target.value)}
              className={inputClass}
            />
          </div>
        </>
      ) : null}

      {venue ? (
        <>
          <div>
            <label htmlFor="address" className="mb-1 block text-sm text-muted">
              {dict.address}
            </label>
            <input
              id="address"
              type="text"
              value={venue.address}
              onChange={(event) => set("address", event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="website" className="mb-1 block text-sm text-muted">
              {dict.website}
            </label>
            <input
              id="website"
              type="url"
              value={venue.website}
              onChange={(event) => set("website", event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="capacity" className="mb-1 block text-sm text-muted">
              {dict.capacity}
            </label>
            <input
              id="capacity"
              type="number"
              min={1}
              value={venue.capacity}
              onChange={(event) => set("capacity", event.target.value)}
              className={inputClass}
            />
          </div>
        </>
      ) : null}

      {error ? <p className="text-sm text-pink">{error}</p> : null}
      {saved ? <p className="text-sm text-cyan">{dict.saved}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-violet px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? dict.saving : dict.save}
      </button>
    </form>
  );
}
