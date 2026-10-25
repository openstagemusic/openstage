"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { venuePath } from "@/lib/events/paths";
import { withLocale } from "@/lib/i18n/locale-path";
import { createClient } from "@/lib/supabase/client";

import {
  authErrorClass,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "./formStyles";

/**
 * "Aggiungi il tuo locale": la regola esiste già nel database
 * (`venues_insert_own` permette a un profilo con ruolo locale di creare la
 * propria riga). Qui manca solo la porta d'ingresso.
 */
export default function VenueOnboardingForm({ dict }: { dict: Dictionary["onboarding"] }) {
  const router = useRouter();
  const locale = useLocale();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [capacity, setCapacity] = useState("");
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

    const { data: created, error: insertError } = await supabase
      .from("venues")
      .insert({
        profile_id: user.id,
        name,
        city: city || null,
        address: address || null,
        website: website || null,
        capacity: capacity ? Number(capacity) : null,
      })
      .select("id, slug")
      .single();

    if (insertError) {
      setLoading(false);
      setError(insertError.message);
      return;
    }

    // Dopo la creazione si apre la pagina del locale, non un'altra schermata.
    router.push(
      withLocale(locale, created?.slug ? venuePath({ slug: created.slug }) : "/account")
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div>
        <label htmlFor="name" className={authLabelClass}>
          {dict.venueName}
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
          <label htmlFor="capacity" className={authLabelClass}>
            {dict.capacity}
          </label>
          <input
            id="capacity"
            type="number"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            className={authInputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="address" className={authLabelClass}>
          {dict.address}
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className={authInputClass}
        />
      </div>

      <div>
        <label htmlFor="website" className={authLabelClass}>
          {dict.website}
        </label>
        <input
          id="website"
          type="url"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          className={authInputClass}
        />
      </div>

      {error ? (
        <p role="alert" aria-live="polite" className={authErrorClass}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
        {loading ? dict.saving : dict.venueSubmit}
      </button>
    </form>
  );
}
