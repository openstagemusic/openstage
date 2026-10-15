import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, localeFromCountry } from "@/lib/i18n/config";

// TEMPORARY DIAGNOSTIC BUILD — Supabase session refresh removed on purpose.
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
