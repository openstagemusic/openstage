"use client";

/**
 * La locandina disegnata da OpenStage.
 *
 * Serve a chi organizza una serata e non ha una grafica pronta: dai dati che ha
 * già scritto (tipo di evento, titolo, quando, dove, prezzo) nasce una locandina
 * in 4:5, la forma dei poster e dei post quadrati dei social.
 *
 * La foto scelta si disegna **intera**, mai tagliata: riempie la parte alta con
 * la stessa immagine sfocata dietro, esattamente come sulle schede del sito.
 *
 * Nessuna libreria: il disegno è canvas del browser, come previsto dal piano.
 * I tipi di carattere sono quelli del sito, letti dalle variabili CSS (con
 * `next/font` i nomi sono generati, quindi vanno chiesti al documento).
 */

export const FLYER_WIDTH = 1080;
export const FLYER_HEIGHT = 1350;

const DARK = "#07070d";
const WHITE = "#e8e8f2";
const MUTED = "#9aa0b8";
const CYAN = "#22d3ee";

const PAD = 64;
const PHOTO = { x: PAD, y: PAD, width: FLYER_WIDTH - PAD * 2, height: 640 };

export type FlyerInput = {
  /** Tipo di evento, già tradotto ("Concerto"). */
  kind: string;
  title: string;
  venue: string | null;
  city: string | null;
  /** Data e ora già formattate ("sab 8 nov 2026 · 21:30"). */
  when: string | null;
  price: string | null;
  /** Testo per l'ingresso gratuito ("Ingresso gratuito"). */
  freeLabel: string;
  /** La foto scelta nel modulo: sta in memoria, quindi si può disegnare. */
  photo: Blob | null;
};

function cssValue(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  return value || fallback;
}

function loadPhoto(photo: Blob): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(photo);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

function roundRect(
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
function drawCover(
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
function drawContain(
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

function cutToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let cut = text;

  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }

  return `${cut}…`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

/** Il titolo si rimpicciolisce finché sta in tre righe. */
function fitTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  display: string
): { size: number; lines: string[] } {
  for (const size of [84, 76, 68, 60, 52]) {
    ctx.font = `700 ${size}px ${display}`;
    const lines = wrapText(ctx, text, maxWidth);

    if (lines.length <= maxLines) return { size, lines };
  }

  ctx.font = `700 52px ${display}`;
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);

  lines[lines.length - 1] = cutToWidth(ctx, lines[lines.length - 1], maxWidth);

  return { size: 52, lines };
}

/**
 * Disegna la locandina e restituisce il JPEG.
 *
 * `null` quando non c'è un titolo (una locandina senza titolo non serve a
 * nessuno) o quando il browser non sa disegnare.
 */
export async function renderFlyer(input: FlyerInput): Promise<Blob | null> {
  const title = input.title.trim();
  if (title === "") return null;

  const display = cssValue("--font-display", "system-ui, sans-serif");
  const body = cssValue("--font-inter", display);

  // Con `next/font` i caratteri arrivano da file generati: senza aspettarli il
  // canvas disegnerebbe un ripiego, e il titolo cambierebbe forma.
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
    await Promise.all([
      document.fonts.load(`700 84px ${display}`),
      document.fonts.load(`600 40px ${body}`),
    ]).catch(() => undefined);
  }

  const canvas = document.createElement("canvas");
  canvas.width = FLYER_WIDTH;
  canvas.height = FLYER_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const photo = input.photo ? await loadPhoto(input.photo) : null;

  // --- Fondo: scuro, con due aloni neon ------------------------------------
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, FLYER_WIDTH, FLYER_HEIGHT);

  const violetGlow = ctx.createRadialGradient(180, 120, 0, 180, 120, 900);
  violetGlow.addColorStop(0, "rgba(139, 92, 246, 0.35)");
  violetGlow.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = violetGlow;
  ctx.fillRect(0, 0, FLYER_WIDTH, FLYER_HEIGHT);

  const cyanGlow = ctx.createRadialGradient(980, 1240, 0, 980, 1240, 800);
  cyanGlow.addColorStop(0, "rgba(34, 211, 238, 0.25)");
  cyanGlow.addColorStop(1, "rgba(34, 211, 238, 0)");
  ctx.fillStyle = cyanGlow;
  ctx.fillRect(0, 0, FLYER_WIDTH, FLYER_HEIGHT);

  // --- La foto --------------------------------------------------------------
  roundRect(ctx, PHOTO.x, PHOTO.y, PHOTO.width, PHOTO.height, 28);
  ctx.save();
  ctx.clip();

  if (photo) {
    // Dietro, la stessa foto sfocata: i bordi che restano non sono mai vuoti.
    if ("filter" in ctx) {
      ctx.filter = "blur(48px)";
      drawCover(ctx, photo, PHOTO.x, PHOTO.y, PHOTO.width, PHOTO.height);
      ctx.filter = "none";
    } else {
      drawCover(ctx, photo, PHOTO.x, PHOTO.y, PHOTO.width, PHOTO.height);
    }

    ctx.fillStyle = "rgba(7, 7, 13, 0.45)";
    ctx.fillRect(PHOTO.x, PHOTO.y, PHOTO.width, PHOTO.height);

    // Davanti, la foto intera.
    drawContain(ctx, photo, PHOTO.x, PHOTO.y, PHOTO.width, PHOTO.height);
  } else {
    const wall = ctx.createLinearGradient(
      PHOTO.x,
      PHOTO.y,
      PHOTO.x + PHOTO.width,
      PHOTO.y + PHOTO.height
    );
    wall.addColorStop(0, "rgba(139, 92, 246, 0.55)");
    wall.addColorStop(0.5, "rgba(34, 211, 238, 0.35)");
    wall.addColorStop(1, "rgba(244, 114, 182, 0.45)");
    ctx.fillStyle = wall;
    ctx.fillRect(PHOTO.x, PHOTO.y, PHOTO.width, PHOTO.height);

    ctx.font = `700 92px ${display}`;
    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.fillText(
      input.kind.toUpperCase(),
      FLYER_WIDTH / 2,
      PHOTO.y + PHOTO.height / 2 + 32,
      840
    );
    ctx.textAlign = "left";
  }

  ctx.restore();

  // --- Tipo di evento e prezzo ---------------------------------------------
  const innerWidth = FLYER_WIDTH - PAD * 2;
  const rowY = PHOTO.y + PHOTO.height + 96;

  ctx.font = `600 30px ${body}`;
  ctx.fillStyle = CYAN;
  ctx.fillText(input.kind.toUpperCase(), PAD, rowY, innerWidth);

  const price = input.price ?? input.freeLabel;
  if (price) {
    ctx.font = `600 30px ${body}`;
    const label = price;
    const width = ctx.measureText(label).width + 48;

    roundRect(ctx, FLYER_WIDTH - PAD - width, rowY - 34, width, 52, 26);
    ctx.fillStyle = "rgba(34, 211, 238, 0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(34, 211, 238, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.fillText(label, FLYER_WIDTH - PAD - width / 2, rowY, width - 24);
    ctx.textAlign = "left";
  }

  // --- Titolo, e poi quando e dove -----------------------------------------
  const fitted = fitTitle(ctx, title, innerWidth, 3, display);
  const lineHeight = Math.round(fitted.size * 1.08);
  let y = rowY + 68 + fitted.size;

  ctx.font = `700 ${fitted.size}px ${display}`;
  ctx.fillStyle = WHITE;

  for (const line of fitted.lines) {
    ctx.fillText(line, PAD, y, innerWidth);
    y += lineHeight;
  }

  if (input.when) {
    y += 34;
    ctx.font = `600 40px ${body}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(input.when, PAD, y, innerWidth);
  }

  const where = [input.venue, input.city].filter(Boolean).join(" · ");
  if (where) {
    y += 52;
    ctx.font = `400 36px ${body}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(where, PAD, y, innerWidth);
  }

  // --- Firma di OpenStage --------------------------------------------------
  const bar = ctx.createLinearGradient(PAD, 0, FLYER_WIDTH - PAD, 0);
  bar.addColorStop(0, "#8b5cf6");
  bar.addColorStop(0.5, "#22d3ee");
  bar.addColorStop(1, "#f472b6");

  roundRect(ctx, PAD, FLYER_HEIGHT - 152, innerWidth, 6, 3);
  ctx.fillStyle = bar;
  ctx.fill();

  ctx.font = `700 42px ${display}`;
  ctx.fillStyle = WHITE;
  ctx.fillText("OpenStage", PAD, FLYER_HEIGHT - PAD);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}
