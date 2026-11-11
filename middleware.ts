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
    const isRoot = rest === "/";

    // La home sceglie la lingua (307: dipende da chi arriva). Tutti gli altri
    // indirizzi senza lingua sono **legacy**: vanno consolidati sull'italiano
    // con un 308, altrimenti Google continua a indicizzare l'URL di partenza
    // (`/citta/bergamo`) e non sa che esiste `/it/citta/bergamo`.
    url.pathname = isRoot ? `/${preferred}` : `/it${rest}`;

    const redirect = NextResponse.redirect(url, isRoot ? 307 : 308);
    redirect.cookies.set(LOCALE_COOKIE, isRoot ? preferred : "it", LOCALE_COOKIE_OPTIONS);
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

  // Incorniciamento: le pagine normali non si mettono in un iframe altrui
  // (clickjacking); il widget è nato per stare dentro un `<iframe>`, quindi lì
  // la regola si ribalta. Il resto degli header di sicurezza sta in `next.config.ts`.
  if (rest === "/widget" || rest.startsWith("/widget/")) {
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
  } else {
    response.headers.set("X-Frame-Options", "DENY");
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
