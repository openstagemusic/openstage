import type { MetadataRoute } from "next";

import { listArtists, listVenues } from "@/lib/directory/queries";
import { artistPath, eventPath, venuePath } from "@/lib/events/paths";
import { listEvents } from "@/lib/events/queries";
import type { Locale } from "@/lib/i18n/config";
import { getSiteUrl } from "@/lib/seo/site";

/**
 * Mappa del sito per i motori di ricerca.
 *
 * Si costruisce dal database, a ogni richiesta: nulla da aggiornare a mano, e
 * nessun indirizzo che non esista davvero.
 *
 * Il middleware non tocca `sitemap.xml` (il matcher esclude i file `.xml`),
 * quindi l'indirizzo resta senza prefisso di lingua: dentro ci sono entrambe le
 * versioni (`/it/…` e `/en/…`), collegate fra loro da `alternates`.
 */

// Le pagine leggono il database: la mappa si genera a richiesta, non alla build.
export const dynamic = "force-dynamic";

/** Pagine pubbliche fisse. Le aree private (accesso, onboarding) non entrano. */
const STATIC_PATHS = [
  "/",
  "/mappa",
  "/artisti",
  "/locali",
  "/per-gli-artisti",
  "/per-le-venue",
  "/about",
  "/contatti",
  "/faq",
  "/privacy",
  "/terms",
  "/cookies",
];

const MAX_PER_SECTION = 500;

function entry(path: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  const url = (locale: Locale) => `${getSiteUrl()}/${locale}${path === "/" ? "" : path}`;

  return {
    url: url("it"),
    lastModified,
    changeFrequency: "daily",
    priority: path === "/" ? 1 : 0.7,
    alternates: {
      languages: { it: url("it"), en: url("en") },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [artists, venues, events] = await Promise.all([
    listArtists({ perPage: MAX_PER_SECTION }),
    listVenues({ perPage: MAX_PER_SECTION }),
    listEvents({ perPage: MAX_PER_SECTION }),
  ]);

  return [
    ...STATIC_PATHS.map((path) => entry(path)),
    ...artists.items.map((artist) => entry(artistPath(artist))),
    ...venues.items.map((venue) => entry(venuePath(venue))),
    ...events.events.map((event) => entry(eventPath(event), new Date(event.startsAt))),
  ];
}
