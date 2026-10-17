import type { Metadata } from "next";

import type { PublicEvent } from "./types";

/** Titolo e descrizione di una scheda evento, condivisi fra le due rotte. */
export function eventMetadata(event: PublicEvent): Metadata {
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
  };
}
