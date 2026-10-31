import { ImageResponse } from "next/og";

import { allowOgRequest, tooManyRequests } from "@/lib/seo/og-rate-limit";

import { getArtistBySlug, getVenueBySlug } from "@/lib/directory/queries";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { inlinePhoto } from "@/lib/seo/inline-photo";
import { profileOgCard } from "@/lib/seo/og-card";

/**
 * L'anteprima social di una scheda artista o locale.
 *
 * Stessa rotta per i due tipi: cambia solo l'etichetta. La lingua viaggia
 * nell'indirizzo, come per le serate, così la cache non mescola le versioni.
 */

export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 630 };

type RouteContext = { params: Promise<{ kind: string; slug: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  if (!allowOgRequest(request)) return tooManyRequests();

  const { kind, slug } = await params;

  if (kind !== "artist" && kind !== "venue") {
    return new Response("Non trovato", { status: 404 });
  }

  const page = kind === "artist" ? await getArtistBySlug(slug) : await getVenueBySlug(slug);
  if (!page) return new Response("Non trovato", { status: 404 });

  const requested = new URL(request.url).searchParams.get("lang");
  const locale = isLocale(requested) ? requested : defaultLocale;
  const dict = getDictionary(locale);

  const photo = await inlinePhoto(
    kind === "artist"
      ? page.bannerUrl ?? page.avatarUrl
      : page.bannerUrl ?? page.avatarUrl
  );

  const meta =
    kind === "artist"
      ? [(page as { genre: string | null }).genre, page.city].filter(Boolean).join(" · ")
      : [(page as { address: string | null }).address, page.city].filter(Boolean).join(" · ");

  const image = new ImageResponse(
    profileOgCard({
      kind:
        kind === "artist"
          ? dict.nav.artists
          : dict.nav.venues,
      name: page.name.length > 70 ? `${page.name.slice(0, 68)}…` : page.name,
      meta,
      photo,
      tagline: dict.meta.title,
    }),
    {
      ...SIZE,
      headers: { "Cache-Control": "public, max-age=0, s-maxage=3600" },
    }
  );

  return image;
}
