import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, localeFromCountry } from "@/lib/i18n/config";
import {
  LOCALE_HEADER,
  PATHNAME_HEADER,
  SEARCH_HEADER,
  splitLocalePath,
} from "@/lib/i18n/locale-path";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Edge middleware.
 *
 * 1. **Lingua nell'URL**: chi arriva senza prefisso viene portato su `/it/...`
 *    o `/en/...` (preferenza salvata, altrimenti paese dall'IP). Le pagine
 *    restano dove sono: `/it/locali` viene riscritto internamente in `/locali`.
 * 2. Passa lingua e percorso corrente alle Server Component via header.
 * 3. Aggiorna la sessione Supabase (vedi `updateSession`).
 */
export async function middleware(request: NextRequest) {
  const { locale, rest } = splitLocalePath(request.nextUrl.pathname);

  if (!locale) {
    const stored = request.cookies.get(LOCALE_COOKIE)?.value;
    const preferred = stored === "it" || stored === "en"
      ? stored
      : localeFromCountry(request.headers.get("x-vercel-ip-country"));

    const url = request.nextUrl.clone();
    url.pathname = rest === "/" ? `/${preferred}` : `/${preferred}${rest}`;

    const redirect = NextResponse.redirect(url);
    redirect.cookies.set(LOCALE_COOKIE, preferred, LOCALE_COOKIE_OPTIONS);
    return redirect;
  }

  const response = await updateSession(request, {
    // Le pagine non sanno nulla della lingua: `/it/locali` serve `/locali`,
    // mentre l'indirizzo che si vede (e che Google indicizza) resta quello.
    rewriteTo: rest,
    extraHeaders: {
      [LOCALE_HEADER]: locale,
      [PATHNAME_HEADER]: rest,
      [SEARCH_HEADER]: request.nextUrl.search,
    },
  });

  // Il percorso vince sulla preferenza: la lingua dell'URL diventa quella ricordata.
  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Tutto tranne: asset di Next, file statici, e le route che non sono pagine
     * (`/auth/*` callback di Supabase, `/api/*`): quelle non hanno una lingua.
     */
    "/((?!_next/static|_next/image|auth|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
