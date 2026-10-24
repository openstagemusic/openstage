import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isLocale, localeFromCountry, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { withLocale } from "@/lib/i18n/locale-path";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

type OtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

function isOtpType(value: string | null): value is OtpType {
  return (
    value === "signup" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "email_change" ||
    value === "email"
  );
}

/**
 * Conferma email e reset password con `token_hash`.
 *
 * A differenza del flusso PKCE, questo indirizzo non dipende dal browser in cui
 * è stata fatta la richiesta: il link può essere aperto da Gmail, Chrome, Opera
 * o da un altro telefono. Supabase verifica il token qui e crea la sessione.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next") ?? (type === "recovery" ? "/reset-password" : "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const stored = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(stored)
    ? stored
    : localeFromCountry(request.headers.get("x-vercel-ip-country"));

  const cookieNext = withLocale(locale, next);
  const failure = withLocale(
    locale,
    type === "recovery" ? "/forgot-password?error=expired" : "/login?error=auth"
  );

  if (!tokenHash || !isOtpType(type) || !isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}${failure}`);
  }

  const pendingCookies: { name: string; value: string; options?: CookieOptions }[] = [];

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies.splice(0, pendingCookies.length, ...cookiesToSet);
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(`${origin}${failure}`);
  }

  const redirect = NextResponse.redirect(`${origin}${cookieNext}`);
  pendingCookies.forEach(({ name, value, options }) =>
    redirect.cookies.set(name, value, options)
  );
  return redirect;
}
