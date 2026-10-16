"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Dictionary } from "@/i18n/dictionaries/en";
import { createClient } from "@/lib/supabase/client";

type Role = "fan" | "artist" | "venue";

/**
 * Role picker shown right after the first OAuth sign-in (Google does not carry
 * sign-up metadata, so the profile is created with the default `fan` role).
 * Writes the real role on the profile row and marks `user_metadata.role`, which
 * is what tells the callback that the choice has already been made.
 */
export default function RolePicker({ dict }: { dict: Dictionary["onboarding"] }) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const options: { value: Role; label: string; description: string }[] = [
    { value: "fan", label: dict.roleFan, description: dict.roleFanText },
    { value: "artist", label: dict.roleArtist, description: dict.roleArtistText },
    { value: "venue", label: dict.roleVenue, description: dict.roleVenueText },
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!role) {
      return;
    }

    setError(null);
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    // 1. Profilo: RLS consente di aggiornare solo la propria riga.
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);

    if (profileError) {
      setLoading(false);
      setError(profileError.message || dict.roleError);
      return;
    }

    // 2. Metadati: marcatore "ruolo scelto", così il passaggio non riappare.
    const { error: metadataError } = await supabase.auth.updateUser({ data: { role } });
    setLoading(false);

    if (metadataError) {
      setError(metadataError.message || dict.roleError);
      return;
    }

    router.push(role === "artist" ? "/onboarding/artist" : "/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-3">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
            role === option.value
              ? "border-violet/60 bg-violet/10"
              : "border-white/10 bg-white/5 hover:bg-white/10"
          }`}
        >
          <input
            type="radio"
            name="role"
            value={option.value}
            checked={role === option.value}
            onChange={() => setRole(option.value)}
            className="mt-1 accent-violet"
          />
          <span>
            <span className="block text-sm font-medium text-white">{option.label}</span>
            <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
          </span>
        </label>
      ))}

      {error ? <p className="text-sm text-pink">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || !role}
        className="w-full rounded-xl bg-gradient-to-r from-violet to-cyan px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? dict.roleSaving : dict.roleSubmit}
      </button>
    </form>
  );
}
