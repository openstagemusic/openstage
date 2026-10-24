import { NextResponse, type NextRequest } from "next/server";

import { isLocale, localeFromCountry, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { withLocale } from "@/lib/i18n/locale-path";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-confirmation callback.
 * Supabase redirects here with a `code` that we exchange for a real session.
 *
 * Questo indirizzo non passa dal middleware (è fisso, lo richiede Supabase):
 * la lingua la ricaviamo qui dalla preferenza salvata o dal paese, così il
 * ritorno resta nella lingua giusta.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const stored = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(stored)
    ? stored
    : localeFromCountry(request.headers.get("x-vercel-ip-country"));

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Google (like every OAuth provider) cannot carry sign-up metadata, so the
      // profile is created with the default `fan` role: on the first access we
      // ask for the real role instead of silently keeping the default.
      // Il reset password non deve passare dall'onboarding: l'utente esiste già.
      const isPasswordReset = next.startsWith("/reset-password");
      if (!isPasswordReset && !data.user?.user_metadata?.role) {
        return NextResponse.redirect(`${origin}${withLocale(locale, "/onboarding/role")}`);
      }

      return NextResponse.redirect(`${origin}${withLocale(locale, next)}`);
    }
  }

  return NextResponse.redirect(`${origin}${withLocale(locale, "/login?error=auth")}`);
}
