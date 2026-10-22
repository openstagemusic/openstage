/**
 * Le locandine su Supabase Storage possono essere servite già ridimensionate.
 *
 * Il file caricato resta quello originale (fino a 1600 px), ma la pagina non ha
 * bisogno di scaricarlo tutto: l'endpoint `render/image` di Supabase genera una
 * variante più leggera e la tiene in cache. Per gli indirizzi esterni non
 * cambiamo niente: non sappiamo se e come quel server sappia ridimensionare.
 */

const PUBLIC_MARKER = "/storage/v1/object/public/";
const RENDER_MARKER = "/storage/v1/render/image/public/";

export function coverVariant(
  src: string | null,
  width: number,
  quality = 72,
): string | null {
  if (!src) return null;

  const marker = src.includes(PUBLIC_MARKER)
    ? PUBLIC_MARKER
    : src.includes(RENDER_MARKER)
      ? RENDER_MARKER
      : null;

  if (!marker) return src;

  const base =
    marker === PUBLIC_MARKER
      ? src.replace(PUBLIC_MARKER, RENDER_MARKER)
      : src;

  try {
    const url = new URL(base);
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(quality));
    return url.toString();
  } catch {
    return src;
  }
}

export function coverSrcSet(
  src: string | null,
  widths: number[],
  quality = 72,
): string | undefined {
  if (!src || (!src.includes(PUBLIC_MARKER) && !src.includes(RENDER_MARKER))) {
    return undefined;
  }

  return widths
    .map((width) => `${coverVariant(src, width, quality)} ${width}w`)
    .join(", ");
}
