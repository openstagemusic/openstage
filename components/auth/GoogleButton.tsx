"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { OAUTH_NEXT_COOKIE } from "@/lib/auth/oauth-next";

import { authSecondaryButtonClass } from "./formStyles";

export default function GoogleButton({ label, next = "/" }: { label: string; next?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    document.cookie = `${OAUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
