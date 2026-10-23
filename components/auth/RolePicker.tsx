"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { withLocale } from "@/lib/i18n/locale-path";
import { createClient } from "@/lib/supabase/client";

import { authErrorClass, authNoteClass, authPrimaryButtonClass } from "./formStyles";

type Role = "fan" | "artist" | "venue";

/**
 * Scelta del ruolo, mostrata ai **fan**: al primo accesso con Google e a chi,
 * essendo fan, decide di passare ad artista o locale.
 *
 * La transizione è irreversibile: la regola vera è nel database
 * (`prevent_role_escalation`, migration 0004), qui la verifichiamo rileggendo
 * il ruolo salvato, così l'utente non vede mai una finta riuscita.
 */
export default function RolePicker({ dict }: { dict: Dictionary["onboarding"] }) {
  const router = useRouter();
  const locale = useLocale();
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
      router.push(withLocale(locale, "/login"));
      return;
    }

    // 1. Profilo: RLS consente di aggiornare solo la propria riga, e il trigger
    //    accetta solo la transizione fan -> artist | venue. Rileggiamo la riga
    //    risultante: se il database non l'ha accettata, lo diciamo.
    const { data: updated, error: profileError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id)
      .select("role")
      .single();

    if (profileError || updated?.role !== role) {
      setLoading(false);
      setError(profileError?.message || dict.roleError);
      return;
    }

    // 2. Metadati: marcatore "ruolo scelto", così il passaggio non riappare.
    const { error: metadataError } = await supabase.auth.updateUser({ data: { role } });
    setLoading(false);

    if (metadataError) {
      setError(metadataError.message || dict.roleError);
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
    <form onSubmit={handleSubmit} className="space-y-3">
      {options.map((option, index) => (
        <label
          key={option.value}
          className={`flex cursor-pointer items-start gap-4 border p-4 transition-colors focus-within:ring-2 focus-within:ring-cyan/50 focus-within:ring-offset-2 focus-within:ring-offset-bg ${
            role === option.value
              ? "border-violet bg-violet/10"
              : "border-line bg-surface/40 hover:border-line-strong hover:bg-white/[0.03]"
          }`}
        >
          <input
            type="radio"
            name="role"
            value={option.value}
            checked={role === option.value}
            onChange={() => setRole(option.value)}
            className="sr-only"
          />
          <span className="mt-0.5 font-mono text-[10px] tracking-[0.16em] text-cyan">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-semibold text-white">
              {option.label}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              {option.description}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`mt-1 text-sm ${role === option.value ? "text-cyan" : "text-muted"}`}
          >
            {role === option.value ? "●" : "○"}
          </span>
        </label>
      ))}

      <p className={authNoteClass}>{dict.roleIrreversible}</p>

      {error ? (
        <p role="alert" aria-live="polite" className={authErrorClass}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading || !role} className={authPrimaryButtonClass}>
        {loading ? dict.roleSaving : dict.roleSubmit}
      </button>
    </form>
  );
}
