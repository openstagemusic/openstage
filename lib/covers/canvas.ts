/**
 * Le matite del disegno su canvas.
 *
 * Stanno qui perché servono a **due** immagini che escono da OpenStage: la
 * locandina della serata (`flyer.ts`, 1080×1350) e le Share Card
 * (`share.ts`, Storia e Quadrato). Sono lo stesso mestiere — sfondo scuro,
 * aloni neon, foto intera, titolo che si rimpicciolisce finché ci sta — e
 * duplicarle vorrebbe dire correggere ogni difetto due volte.
 *
 * Nessuna libreria di disegno: canvas del browser, come previsto dal piano.
 */

/** La foto: un file appena scelto (sta in memoria) o un indirizzo già salvato. */
export type CanvasPhoto = Blob | string;

/** Colori del sito, in un posto solo: le immagini devono sembrare OpenStage. */
export const INK = "#07070d";
export const PAPER = "#e8e8f2";
export const MUTED = "#9aa0b8";
export const CYAN = "#22d3ee";
export const VIOLET = "#8b5cf6";
export const PINK = "#f472b6";

/** I tipi di carattere del sito, chiesti al documento (con `next/font` i nomi sono generati). */
export function cssValue(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  return value || fallback;
}

/**
 * Prepara la foto per il disegno.
 *
 * Le immagini che vivono sul nostro archivio si possono usare in canvas; quelle
 * esterne (le locandine degli eventi inseriti prima dei file) si chiedono con
 * `crossOrigin`: se il sito di partenza non lo concede il caricamento fallisce e
 * l'immagine si disegna **senza** foto, invece di rompersi.
 */
export function loadPhoto(source: CanvasPhoto): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const local = typeof source !== "string";
    const url = local ? URL.createObjectURL(source as Blob) : source;

    const image = new Image();
    if (!local) image.crossOrigin = "anonymous";

    image.onload = () => {
      if (local) URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      if (local) URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

/** Aspetta che i caratteri del sito siano pronti: senza, il canvas ripiega su altri. */
export async function waitForFonts(display: string, body: string, titleSize: number): Promise<void> {
  if (!document.fonts) return;

  await document.fonts.ready.catch(() => undefined);
  await Promise.all([
    document.fonts.load(`700 ${titleSize}px ${display}`),
    document.fonts.load(`600 40px ${body}`),
  ]).catch(() => undefined);
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** Riempie il riquadro tagliando quel che avanza: serve solo allo sfondo. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;

  ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
}

/** Disegna la foto **intera**, centrata nel riquadro. */
export function drawContain(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;

  ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
}

/**
 * La foto in un riquadro arrotondato, **mai tagliata**: dietro la stessa foto
 * sfocata, davanti quella intera. È la stessa regola delle schede del sito.
 */
export function drawPhoto(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  /** Cosa disegnare quando non c'è la foto (di solito una parete neon). */
  empty: () => void
) {
  roundRect(ctx, x, y, width, height, radius);
  ctx.save();
  ctx.clip();

  if (photo) {
    if ("filter" in ctx) {
      ctx.filter = "blur(48px)";
      drawCover(ctx, photo, x, y, width, height);
      ctx.filter = "none";
    } else {
      drawCover(ctx, photo, x, y, width, height);
    }

    ctx.fillStyle = "rgba(7, 7, 13, 0.45)";
    ctx.fillRect(x, y, width, height);

    drawContain(ctx, photo, x, y, width, height);
  } else {
    empty();
  }

  ctx.restore();
}

/** La parete neon che prende il posto della foto quando non c'è. */
export function neonWall(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const wall = ctx.createLinearGradient(x, y, x + width, y + height);
  wall.addColorStop(0, "rgba(139, 92, 246, 0.55)");
  wall.addColorStop(0.5, "rgba(34, 211, 238, 0.35)");
  wall.addColorStop(1, "rgba(244, 114, 182, 0.45)");
  ctx.fillStyle = wall;
  ctx.fillRect(x, y, width, height);
}

/** Gli aloni di fondo: viola in alto a sinistra, ciano in basso a destra. */
export function drawGlows(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, width, height);

  const violetGlow = ctx.createRadialGradient(180, 120, 0, 180, 120, Math.max(width, height) * 0.85);
  violetGlow.addColorStop(0, "rgba(139, 92, 246, 0.35)");
  violetGlow.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = violetGlow;
  ctx.fillRect(0, 0, width, height);

  const cyanGlow = ctx.createRadialGradient(
    width - 100,
    height - 80,
    0,
    width - 100,
    height - 80,
    Math.max(width, height) * 0.75
  );
  cyanGlow.addColorStop(0, "rgba(34, 211, 238, 0.25)");
  cyanGlow.addColorStop(1, "rgba(34, 211, 238, 0)");
  ctx.fillStyle = cyanGlow;
  ctx.fillRect(0, 0, width, height);
}

export function cutToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let cut = text;

  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }

  return `${cut}…`;
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) {
      lines.push(line);
      line = "";
    }

    // Una parola più larga della riga: si taglia, non esce dal foglio.
    line = ctx.measureText(word).width <= maxWidth ? word : cutToWidth(ctx, word, maxWidth);
  }

  if (line) lines.push(line);

  return lines;
}

/** Il titolo si rimpicciolisce finché sta nel numero di righe concesse. */
export function fitTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  display: string,
  sizes: number[] = [84, 76, 68, 60, 52]
): { size: number; lines: string[] } {
  for (const size of sizes) {
    ctx.font = `700 ${size}px ${display}`;
    const lines = wrapText(ctx, text, maxWidth);

    if (lines.length <= maxLines) return { size, lines };
  }

  const smallest = sizes[sizes.length - 1];
  ctx.font = `700 ${smallest}px ${display}`;
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);

  lines[lines.length - 1] = cutToWidth(ctx, lines[lines.length - 1], maxWidth);

  return { size: smallest, lines };
}
