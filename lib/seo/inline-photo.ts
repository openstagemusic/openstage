/**
 * Scarica un'immagine e la restituisce come `data:` URL, oppure `null`.
 *
 * Le card Open Graph disegnano su canvas: la foto deve arrivare già dentro
 * l'immagine, altrimenti il crawler social non la vede. Se l'archivio è lento o
 * il file è enorme si restituisce `null`: meglio una card senza foto che nessuna
 * anteprima.
 */
export async function inlinePhoto(url: string | null): Promise<string | null> {
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
    if (buffer.byteLength > 4_000_000) return null;

    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
