import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, localeFromCountry } from "@/lib/i18n/config";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Runs on every request:
 *  1. refreshes the Supabase auth session (cookie based);
 *  2. resolves the visitor's language from their country (free Vercel edge geo),
 *     storing the choice in a cookie so it survives navigation.
 *
 * The Supabase part is intentionally defensive: a misconfigured or unreachable
 * project must never take the whole site down with a 500.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      // Keeps the session fresh and must be called on every request.
      await supabase.auth.getUser();
    } catch (error) {
      console.error("[middleware] Supabase session refresh failed:", error);
    }
  }

  if (!request.cookies.get(LOCALE_COOKIE)) {
    const locale = localeFromCountry(request.headers.get("x-vercel-ip-country"));
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}
