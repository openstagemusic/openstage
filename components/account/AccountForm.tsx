"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Dictionary } from "@/i18n/dictionaries/en";
import { createClient } from "@/lib/supabase/client";
import { validateSocialLinks, type SocialKind } from "@/lib/social/links";

import {
  authErrorClass,
  authInputClass,
  authLabelClass,
  authNoticeClass,
  authPrimaryButtonClass,
} from "@/components/auth/formStyles";

export type AccountArtist = {
  id: string;
  name: string;
  city: string;
  genre: string;
  spotifyUrl: string;
  bio: string;
  websiteUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  soundcloudUrl: string;
  bandcampUrl: string;
  linktreeUrl: string;
};

export type AccountVenue = {
  id: string;
  name: string;
  city: string;
  address: string;
  website: string;
  capacity: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  soundcloudUrl: string;
  bandcampUrl: string;
  linktreeUrl: string;
};

/** I campi social condivisi fra artista e locale (il sito ha nomi diversi). */
const SOCIAL_FIELDS = [
  { kind: "instagram", field: "instagramUrl" },
  { kind: "facebook", field: "facebookUrl" },
  { kind: "tiktok", field: "tiktokUrl" },
  { kind: "youtube", field: "youtubeUrl" },
  { kind: "soundcloud", field: "soundcloudUrl" },
  { kind: "bandcamp", field: "bandcampUrl" },
  { kind: "linktree", field: "linktreeUrl" },
] as const;

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
  social,
}: {
  subject: AccountSubject;
  dict: Dictionary["account"];
  social: Dictionary["social"];
}) {
  const router = useRouter();
  const [values, setValues] = useState<AccountArtist | AccountVenue>(subject.values);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invalidLinks, setInvalidLinks] = useState<SocialKind[]>([]);

  function set(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }) as AccountArtist | AccountVenue);
    setSaved(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    // Link e social: si normalizzano prima di scrivere. In questo modo nel
    // database arriva solo la forma canonica (https, dominio giusto) e un link
    // sbagliato non spegne le icone della scheda pubblica.
    const input =
      subject.kind === "artist"
        ? {
            website: (values as AccountArtist).websiteUrl,
            instagram: (values as AccountArtist).instagramUrl,
            facebook: (values as AccountArtist).facebookUrl,
            tiktok: (values as AccountArtist).tiktokUrl,
            youtube: (values as AccountArtist).youtubeUrl,
            soundcloud: (values as AccountArtist).soundcloudUrl,
            bandcamp: (values as AccountArtist).bandcampUrl,
            linktree: (values as AccountArtist).linktreeUrl,
            spotify: (values as AccountArtist).spotifyUrl,
          }
        : {
            website: (values as AccountVenue).website,
            instagram: (values as AccountVenue).instagramUrl,
            facebook: (values as AccountVenue).facebookUrl,
            tiktok: (values as AccountVenue).tiktokUrl,
            youtube: (values as AccountVenue).youtubeUrl,
            soundcloud: (values as AccountVenue).soundcloudUrl,
            bandcamp: (values as AccountVenue).bandcampUrl,
            linktree: (values as AccountVenue).linktreeUrl,
            spotify: "",
          };

    const { urls, invalid } = validateSocialLinks(input);
    setInvalidLinks(invalid);

    if (invalid.length > 0) {
      setLoading(false);
      setError(dict.invalidLink);
      return;
    }

    const supabase = createClient();

    const { error: updateError } =
      subject.kind === "artist"
        ? await supabase
            .from("artists")
            .update({
              name: (values as AccountArtist).name,
              city: (values as AccountArtist).city || null,
              genre: (values as AccountArtist).genre || null,
              spotify_url: urls.spotify,
              website_url: urls.website,
              instagram_url: urls.instagram,
              facebook_url: urls.facebook,
              tiktok_url: urls.tiktok,
              youtube_url: urls.youtube,
              soundcloud_url: urls.soundcloud,
              bandcamp_url: urls.bandcamp,
              linktree_url: urls.linktree,
              bio: (values as AccountArtist).bio || null,
            })
            .eq("id", subject.values.id)
        : await supabase
            .from("venues")
            .update({
              name: (values as AccountVenue).name,
              city: (values as AccountVenue).city || null,
              address: (values as AccountVenue).address || null,
              website: urls.website,
              instagram_url: urls.instagram,
              facebook_url: urls.facebook,
              tiktok_url: urls.tiktok,
              youtube_url: urls.youtube,
              soundcloud_url: urls.soundcloud,
              bandcamp_url: urls.bandcamp,
              linktree_url: urls.linktree,
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

  const socialFields = artist
    ? [
        {
          kind: "website" as const,
          field: "websiteUrl" as const,
          label: social.website,
          value: artist.websiteUrl,
        },
        ...SOCIAL_FIELDS.map((item) => ({
          ...item,
          label: social[item.kind],
          value: artist[item.field],
        })),
      ]
    : venue
      ? SOCIAL_FIELDS.map((item) => ({
          ...item,
          label: social[item.kind],
          value: venue[item.field],
        }))
      : [];

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
          value={values.name}
          onChange={(event) => set("name", event.target.value)}
          className={authInputClass}
        />
      </div>

      <div>
        <label htmlFor="city" className={authLabelClass}>
          {dict.city}
        </label>
        <input
          id="city"
          type="text"
          value={values.city}
          onChange={(event) => set("city", event.target.value)}
          className={authInputClass}
        />
      </div>

      {artist ? (
        <>
          <div>
            <label htmlFor="genre" className={authLabelClass}>
              {dict.genre}
            </label>
            <input
              id="genre"
              type="text"
              value={artist.genre}
              onChange={(event) => set("genre", event.target.value)}
              className={authInputClass}
            />
          </div>

          <div>
            <label htmlFor="spotify" className={authLabelClass}>
              {dict.spotifyUrl}
            </label>
            <input
              id="spotify"
              type="url"
              value={artist.spotifyUrl}
              onChange={(event) => set("spotifyUrl", event.target.value)}
              className={authInputClass}
            />
            <p className="mt-1 text-xs leading-relaxed text-muted">{dict.spotifyHint}</p>
          </div>

          <div>
            <label htmlFor="bio" className={authLabelClass}>
              {dict.bio}
            </label>
            <textarea
              id="bio"
              rows={5}
              value={artist.bio}
              onChange={(event) => set("bio", event.target.value)}
              className={authInputClass}
            />
          </div>
        </>
      ) : null}

      {venue ? (
        <>
          <div>
            <label htmlFor="address" className={authLabelClass}>
              {dict.address}
            </label>
            <input
              id="address"
              type="text"
              value={venue.address}
              onChange={(event) => set("address", event.target.value)}
              className={authInputClass}
            />
          </div>

          <div>
            <label htmlFor="website" className={authLabelClass}>
              {dict.website}
            </label>
            <input
              id="website"
              type="text"
              inputMode="url"
              value={venue.website}
              onChange={(event) => set("website", event.target.value)}
              className={authInputClass}
            />
          </div>

          <div>
            <label htmlFor="capacity" className={authLabelClass}>
              {dict.capacity}
            </label>
            <input
              id="capacity"
              type="number"
              min={1}
              value={venue.capacity}
              onChange={(event) => set("capacity", event.target.value)}
              className={authInputClass}
            />
          </div>
        </>
      ) : null}

      {socialFields.length > 0 ? (
        <section className="border-t border-line pt-5">
          <h3 className="font-display text-lg font-semibold">{dict.linksTitle}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{dict.linksText}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {socialFields.map((item) => (
              <div key={item.kind}>
                <label htmlFor={`link-${item.kind}`} className={authLabelClass}>
                  {item.label}
                </label>
                <input
                  id={`link-${item.kind}`}
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://"
                  value={item.value}
                  aria-invalid={invalidLinks.includes(item.kind)}
                  onChange={(event) => set(item.field, event.target.value)}
                  className={authInputClass}
                />
                {invalidLinks.includes(item.kind) ? (
                  <span className="mt-1 block text-[10px] text-pink">{social.invalid}</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {error ? (
        <p role="alert" aria-live="polite" className={authErrorClass}>
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" aria-live="polite" className={authNoticeClass}>
          {dict.saved}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className={`${authPrimaryButtonClass} sm:w-auto`}
      >
        {loading ? dict.saving : dict.save}
      </button>
    </form>
  );
}
