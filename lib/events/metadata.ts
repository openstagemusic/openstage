import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";

import { isCancelled, type PublicEvent } from "./types";

/** Titolo, descrizione e anteprima di una scheda evento (una rotta sola). */
export function eventMetadata(event: PublicEvent, locale: Locale): Metadata {
  const cancelled = isCancelled(event);

  const description =
    event.description?.slice(0, 160) ??
    [event.artist?.name, event.venue?.name, event.city].filter(Boolean).join(" · ");

  // Il titolo SEO porta il locale quando non c'è già: chi cerca «calibro 35
  // druso» deve riconoscere la pagina prima di aprirla. Si confronta la prima
  // parola del locale, così «Nuovi Suoni … al NXT» non diventa «… · NXT Station».
  const place = event.venue?.name ?? event.venueName ?? event.city;
  const placeKey = place?.trim().split(/\s+/)[0]?.toLowerCase() ?? null;
  const hasPlace = placeKey ? event.title.toLowerCase().includes(placeKey) : false;
  const title = place && !hasPlace ? `${event.title} · ${place}` : event.title;

  return {
    title,
    description,
    // L'anteprima non è la locandina grezza: è una card 1200×630 disegnata dal
    // server (`/api/og/event/<id>`), con titolo, data e luogo sopra la
    // locandina intera. La lingua viaggia nell'indirizzo, così la stessa
    // immagine non cambia sotto i piedi a chi la mette in cache.
    openGraph: {
      type: "article",
      title,
      description,
      images: [
        {
          url: `/api/og/event/${event.id}?lang=${locale}`,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
    },
    // Un annullato resta raggiungibile per chi ha il link (la pagina lo spiega),
    // ma i motori di ricerca devono smettere di pubblicizzare un concerto che
    // non c'è: la pagina esce dall'indice, i link dentro restano seguiti.
    robots: cancelled ? { index: false, follow: true } : undefined,
  };
}
