import { ImageResponse } from "next/og";

import { formatEventDateLong } from "@/lib/events/format";
import { getEventById } from "@/lib/events/queries";
import { isCancelled, placeName } from "@/lib/events/types";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { eventOgCard } from "@/lib/seo/og-card";

/**
 * L'immagine che si vede quando qualcuno incolla il link di una serata in chat.
 *
 * I crawler social non eseguono JavaScript e non disegnano canvas: se non
 * trovassero un'immagine, di un concerto resterebbe un rettangolo vuoto. La
 * disegna il server (`next/og`, dentro Next: nessun servizio esterno) con la
 * stessa grammatica del sito — fondo scuro, neon, locandina intera.
 *
 * Vive in una rotta e non in un `opengraph-image.tsx` accanto alla pagina perché
 * la scheda sta su una cattura multipla (`/eventi/[...percorso]`) e Next non
 * ammette i file di metadati dentro un segmento che cattura tutto: il server si
 * avviava e ogni richiesta moriva con "Catch-all must be the last part of the URL".
 *
 * La lingua arriva dall'indirizzo (`?lang=`): la stessa immagine non cambia sotto
 * i piedi a chi la mette in cache.
 *
 * La locandina si scarica qui e viaggia dentro l'immagine come dato: se
 * l'archivio non risponde entro due secondi e mezzo, la card esce lo stesso,
 * senza foto. Meglio una card senza poster che nessuna anteprima.
 */

export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 630 };

type RouteContext = { params: Promise<{ id: string }> };

/** La locandina in base64, oppure `null`: mai un errore che rompe la card. */
async function inlinePhoto(url: string | null): Promise<string | null> {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2_500),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    // Una locandina ragionevole sta sotto i 4 MB: oltre, non è una locandina.
    if (buffer.byteLength > 4_000_000) return null;

    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const event = await getEventById(id);
  if (!event) return new Response("Non trovato", { status: 404 });

  const requested = new URL(request.url).searchParams.get("lang");
  const locale = isLocale(requested) ? requested : defaultLocale;
  const dict = getDictionary(locale);

  const photo = await inlinePhoto(event.coverImageUrl);

  const image = new ImageResponse(
    eventOgCard({
      kind: dict.events.kinds[event.kind] ?? dict.events.kinds.other,
      title: event.title.length > 110 ? `${event.title.slice(0, 108)}…` : event.title,
      when: formatEventDateLong(event.startsAt, event.timezone, locale),
      where: [placeName(event), event.city].filter(Boolean).join(" · "),
      photo,
      cancelledLabel: isCancelled(event)
        ? dict.events.cancelledBadge.toUpperCase()
        : null,
      tagline: dict.meta.title,
    }),
    {
      ...SIZE,
      // La card cambia solo quando cambia la serata: un'ora di cache sul bordo
      // è più che sufficiente, e i crawler non aspettano il disegno.
      headers: { "Cache-Control": "public, max-age=0, s-maxage=3600" },
    }
  );

  return image;
}
