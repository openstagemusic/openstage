import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isLocale, localeFromCountry, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { withLocale } from "@/lib/i18n/locale-path";
import { OAUTH_NEXT_COOKIE } from "@/lib/auth/oauth-next";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

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
  const cookieNext = request.cookies.get(OAUTH_NEXT_COOKIE)?.value;
  const rawNext =
    searchParams.get("next") ??
    (cookieNext ? decodeURIComponent(cookieNext) : null) ??
    "/";
  // Solo percorsi interni: evita redirect aperti verso altri domini.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const stored = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(stored)
    ? stored
    : localeFromCountry(request.headers.get("x-vercel-ip-country"));

  if (code && isSupabaseConfigured()) {
    // I cookie di sessione devono finire sulla redirect response: crearli con
    // `cookies()` e restituire un `NextResponse.redirect` nuovo li perde.
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // L'admin entra direttamente nella control room.
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile?.role === "admin") {
          const redirect = NextResponse.redirect(`${origin}${withLocale(locale, "/admin")}`);
          pendingCookies.forEach(({ name, value, options }) =>
            redirect.cookies.set(name, value, options)
          );
          redirect.cookies.set(OAUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
          return redirect;
        }
      }

      // Google (like every OAuth provider) cannot carry sign-up metadata, so the
      // profile is created with the default `fan` role: on the first access we
      // ask for the real role instead of silently keeping the default.
      // Il reset password non deve passare dall'onboarding: l'utente esiste già.
      // `next` può arrivare già con il prefisso di lingua (/it, /en).
      const nextWithoutLocale = next.replace(/^\/(it|en)(?=\/|$)/, "") || "/";
      const isPasswordReset = nextWithoutLocale.startsWith("/reset-password");
      const isClaimInvite = nextWithoutLocale.startsWith("/claim/");
      if (!isPasswordReset && !isClaimInvite && !data.user?.user_metadata?.role) {
        const redirect = NextResponse.redirect(
          `${origin}${withLocale(locale, "/onboarding/role")}`
        );
        pendingCookies.forEach(({ name, value, options }) =>
          redirect.cookies.set(name, value, options)
        );
        redirect.cookies.set(OAUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
        return redirect;
      }

      const redirect = NextResponse.redirect(`${origin}${withLocale(locale, next)}`);
      pendingCookies.forEach(({ name, value, options }) =>
        redirect.cookies.set(name, value, options)
      );
      redirect.cookies.set(OAUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
      return redirect;
    }
  }

  const redirect = NextResponse.redirect(
    `${origin}${withLocale(locale, "/login?error=auth")}`
  );
  redirect.cookies.set(OAUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return redirect;
}
