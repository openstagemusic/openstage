"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { authSecondaryButtonClass } from "./formStyles";

export default function GoogleButton({ label, next = "/" }: { label: string; next?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      className={authSecondaryButtonClass}
    >
      {label}
    </button>
  );
}
