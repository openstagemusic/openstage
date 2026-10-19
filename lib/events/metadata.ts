import type { Metadata } from "next";

import { isCancelled, type PublicEvent } from "./types";

/** Titolo e descrizione di una scheda evento, condivisi fra le due rotte. */
export function eventMetadata(event: PublicEvent): Metadata {
  const cancelled = isCancelled(event);

  const description =
    event.description?.slice(0, 160) ??
    [event.artist?.name, event.venue?.name, event.city].filter(Boolean).join(" · ");

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      images: event.coverImageUrl ? [event.coverImageUrl] : undefined,
    },
    // Un annullato resta raggiungibile per chi ha il link (la pagina lo spiega),
    // ma i motori di ricerca devono smettere di pubblicizzare un concerto che
    // non c'è: la pagina esce dall'indice, i link dentro restano seguiti.
    robots: cancelled ? { index: false, follow: true } : undefined,
  };
}
