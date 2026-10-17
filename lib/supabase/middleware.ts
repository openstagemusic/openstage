import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Runs on every request:
 *  1. refreshes the Supabase auth session (cookie based);
 *  2. forwards to the app the headers prepared by the middleware (lingua e
 *     percorso corrente), prendendoli **al momento** in cui costruisce la
 *     risposta, così i cookie aggiornati da Supabase non vengono persi.
 *
 * The Supabase part is intentionally defensive: a misconfigured or unreachable
 * project must never take the whole site down with a 500.
 */
export type MiddlewareHttpOptions = {
  /** Percorso interno su cui servire la richiesta, mantenendo l'indirizzo visibile. */
  rewriteTo?: string;
  /** Header da aggiungere alla richiesta inoltrata all'applicazione. */
  extraHeaders?: Record<string, string>;
};

export async function updateSession(request: NextRequest, options: MiddlewareHttpOptions = {}) {
  // I cookie di sessione aggiornati vivono in `request.headers`: la copia va
  // fatta a ogni risposta, non una volta sola all'inizio.
  const build = () => {
    const headers = new Headers(request.headers);
    for (const [name, value] of Object.entries(options.extraHeaders ?? {})) {
      headers.set(name, value);
    }

    if (options.rewriteTo) {
      const url = request.nextUrl.clone();
      url.pathname = options.rewriteTo;
      return NextResponse.rewrite(url, { request: { headers } });
    }

    return NextResponse.next({ request: { headers } });
  };

  let response = build();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = build();
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

  return response;
}
