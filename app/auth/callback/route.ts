import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-confirmation callback.
 * Supabase redirects here with a `code` that we exchange for a real session.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Google (like every OAuth provider) cannot carry sign-up metadata, so the
      // profile is created with the default `fan` role: on the first access we
      // ask for the real role instead of silently keeping the default.
      if (!data.user?.user_metadata?.role) {
        return NextResponse.redirect(`${origin}/onboarding/role`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
