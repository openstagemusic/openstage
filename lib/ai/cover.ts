import sharp from "sharp";

import { assertPublicUrl } from "@/lib/ai/fetch-public";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_SIDE = 1600;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function fetchImage(rawUrl: string): Promise<{ buffer: Buffer; type: string } | null> {
  let current = rawUrl;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const url = await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "image/jpeg,image/png,image/webp",
          "User-Agent": "OpenStageBot/1.0 (+https://getopenstage.it)",
        },
        cache: "no-store",
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) return null;
        current = new URL(location, url).toString();
        continue;
      }

      if (!response.ok) return null;

      const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (!ALLOWED_TYPES.includes(type)) return null;

      const contentLength = Number(response.headers.get("content-length") ?? "0");
      if (contentLength > MAX_IMAGE_BYTES) return null;

      if (!response.body) return null;

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > MAX_IMAGE_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }

      return { buffer: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))), type };
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

/**
 * Scarica e prepara una copertina pubblica.
 *
 * Stessi limiti SSRF del testo: http/https, niente host privati, redirect
 * controllati, tetto di byte. L'immagine viene ridimensionata e convertita in
 * JPEG prima di finire nello Storage.
 */
export async function prepareCoverFromUrl(
  rawUrl: string
): Promise<{ buffer: Buffer; contentType: "image/jpeg" } | null> {
  try {
    const image = await fetchImage(rawUrl);
    if (!image) return null;

    const buffer = await sharp(image.buffer)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    return { buffer, contentType: "image/jpeg" };
  } catch (error) {
    console.error("[ai] cover:", error instanceof Error ? error.message : error);
    return null;
  }
}
