import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo/site";

/**
 * Regole per i crawler.
 *
 * Restano fuori le pagine che non hanno senso nei risultati di ricerca: accesso,
 * registrazione, onboarding, creazione evento (riservata) e le API. Tutto il
 * resto — eventi, artisti e locali — è pubblico e indicizzabile.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/login", "/register", "/onboarding", "/events", "/admin", "/api/"],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
