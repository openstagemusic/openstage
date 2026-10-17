"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { withLocale } from "@/lib/i18n/locale-path";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-violet/60";

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

    const { error: insertError } = await supabase.from("venues").insert({
      profile_id: user.id,
      name,
      city: city || null,
      address: address || null,
      website: website || null,
      capacity: capacity ? Number(capacity) : null,
    });

    if (insertError) {
      setLoading(false);
      setError(insertError.message);
      return;
    }

    router.push(withLocale(locale, "/account"));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-muted">
          {dict.venueName}
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
        <label htmlFor="address" className="mb-1 block text-sm text-muted">
          {dict.address}
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
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
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
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
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          className={inputClass}
        />
      </div>

      {error ? <p className="text-sm text-pink">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-violet px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? dict.saving : dict.venueSubmit}
      </button>
    </form>
  );
}
