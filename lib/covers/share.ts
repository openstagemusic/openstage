"use client";

/**
 * Le Share Card: l'immagine che si manda in chat.
 *
 * Due formati, quelli che servono davvero: **Storia** (1080×1920, Instagram,
 * WhatsApp, TikTok) e **Quadrato** (1080×1080, il post). Dentro: la locandina
 * intera, il titolo, quando e dove, e un **QR** che porta alla pagina canonica
 * dell'evento — così l'immagine continua a funzionare anche quando qualcuno la
 * salva e la rimanda sei mesi dopo, quando la didascalia è sparita.
 *
 * Si disegna **nel browser** (nessun servizio, nessuna attesa di rete). Il server
 * non può: i crawler social non eseguono canvas, e per loro c'è l'immagine
 * Open Graph (`app/eventi/.../opengraph-image.tsx`).
 *
 * Le matite sono quelle della locandina (`canvas.ts`).
 */

import QRCode from "qrcode";

import {
  cssValue,
  CYAN,
  drawGlows,
  drawPhoto,
  fitTitle,
  loadPhoto,
  MUTED,
  neonWall,
  PAPER,
  PINK,
  roundRect,
  waitForFonts,
  wrapText,
  type CanvasPhoto,
} from "./canvas";

export type ShareFormat = "story" | "square";

export const SHARE_SIZES: Record<ShareFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

export type ShareCardInput = {
  format: ShareFormat;
  /** Tipo di evento, già tradotto ("Concerto"). */
  kind: string;
  title: string;
  /** Data e ora già formattate ("sab 8 nov 2026 · 21:30"). */
  when: string;
  /** "Locale · Città". */
  where: string;
  price: string | null;
  /** L'indirizzo canonico assoluto: è quello che finisce nel QR. */
  url: string;
  photo: CanvasPhoto | null;
  /** Una serata annullata si annuncia, non si pubblicizza. */
  cancelled: boolean;
  labels: {
    cancelledBadge: string;
    cancelledNote: string;
    qrHint: string;
  };
};

const PAD = 72;

/** Il badge di testo con bordo: serve al prezzo e all'annullamento. */
function badge(
  ctx: CanvasRenderingContext2D,
  text: string,
  right: number,
  centerY: number,
  color: string,
  body: string,
  size = 30
): void {
  ctx.font = `600 ${size}px ${body}`;
  const width = Math.min(ctx.measureText(text).width + 48, right - PAD);
  const height = size + 22;

  roundRect(ctx, right - width, centerY - height / 2, width, height, height / 2);
  ctx.fillStyle = "rgba(7, 7, 13, 0.72)";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = PAPER;
  ctx.textAlign = "center";
  ctx.fillText(text, right - width / 2, centerY + size * 0.35, width - 28);
  ctx.textAlign = "left";
}

/** Il QR su fondo bianco arrotondato: leggibile da qualsiasi telefono. */
async function drawQr(
  ctx: CanvasRenderingContext2D,
  url: string,
  x: number,
  y: number,
  size: number
): Promise<void> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, url, {
    margin: 0,
    width: size,
    color: { dark: "#07070dff", light: "#ffffffff" },
  });

  const frame = 12;
  roundRect(ctx, x - frame, y - frame, size + frame * 2, size + frame * 2, 22);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.drawImage(canvas, x, y, size, size);
}

/** La barra neon: la firma di OpenStage, sempre uguale. */
function neonBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  const bar = ctx.createLinearGradient(x, 0, x + width, 0);
  bar.addColorStop(0, "#8b5cf6");
  bar.addColorStop(0.5, "#22d3ee");
  bar.addColorStop(1, "#f472b6");

  roundRect(ctx, x, y, width, 6, 3);
  ctx.fillStyle = bar;
  ctx.fill();
}

/**
 * Disegna la Share Card e restituisce il **PNG**.
 *
 * `null` quando manca il titolo o quando il browser non sa disegnare.
 */
export async function renderShareCard(input: ShareCardInput): Promise<Blob | null> {
  const title = input.title.trim();
  if (title === "") return null;

  const { width, height } = SHARE_SIZES[input.format];
  const display = cssValue("--font-display", "system-ui, sans-serif");
  const body = cssValue("--font-inter", display);

  await waitForFonts(display, body, 96);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const photo = input.photo ? await loadPhoto(input.photo) : null;
  const story = input.format === "story";
  const innerWidth = width - PAD * 2;

  drawGlows(ctx, width, height);

  // --- La locandina, intera -------------------------------------------------
  const photoBox = story ? { y: PAD, height: 980 } : { y: PAD, height: 470 };

  drawPhoto(ctx, photo, PAD, photoBox.y, innerWidth, photoBox.height, 36, () => {
    neonWall(ctx, PAD, photoBox.y, innerWidth, photoBox.height);

    ctx.font = `700 ${story ? 96 : 70}px ${display}`;
    ctx.fillStyle = PAPER;
    ctx.textAlign = "center";
    ctx.fillText(
      input.kind.toUpperCase(),
      width / 2,
      photoBox.y + photoBox.height / 2 + 30,
      innerWidth - 80
    );
    ctx.textAlign = "left";
  });

  // Prezzo in alto a destra sulla foto; l'annullamento, se c'è, ha la precedenza.
  if (input.cancelled) {
    badge(ctx, input.labels.cancelledBadge.toUpperCase(), width - PAD - 24, photoBox.y + 64, PINK, body);
  } else if (input.price) {
    badge(ctx, input.price, width - PAD - 24, photoBox.y + 64, "rgba(34, 211, 238, 0.5)", body);
  }

  // --- Tipo, titolo, quando, dove ------------------------------------------
  const rowY = photoBox.y + photoBox.height + (story ? 92 : 76);

  ctx.font = `600 30px ${body}`;
  ctx.fillStyle = CYAN;
  ctx.fillText(input.kind.toUpperCase(), PAD, rowY, innerWidth);

  // Nel quadrato il QR occupa l'angolo in basso a destra: il testo si ferma prima.
  const textWidth = story ? innerWidth : innerWidth - 220;

  const fitted = fitTitle(
    ctx,
    title,
    story ? innerWidth : innerWidth - 160,
    story ? 3 : 2,
    display,
    story ? [96, 88, 80, 70, 60] : [68, 60, 52, 46]
  );
  const lineHeight = Math.round(fitted.size * 1.08);
  let y = rowY + (story ? 64 : 56) + fitted.size;

  ctx.font = `700 ${fitted.size}px ${display}`;
  ctx.fillStyle = PAPER;

  for (const line of fitted.lines) {
    ctx.fillText(line, PAD, y, innerWidth);
    y += lineHeight;
  }

  y += story ? 26 : 20;
  ctx.font = `600 ${story ? 44 : 34}px ${body}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(input.when, PAD, y, textWidth);

  if (input.where) {
    y += story ? 58 : 42;
    ctx.font = `400 ${story ? 36 : 28}px ${body}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(input.where, PAD, y, textWidth);
  }

  // --- QR ---------------------------------------------------------------
  const qrSize = story ? 200 : 140;
  const qrX = width - PAD - qrSize;
  const qrY = height - PAD - qrSize;

  await drawQr(ctx, input.url, qrX, qrY, qrSize);

  // --- Firma di OpenStage ---------------------------------------------------
  if (story) {
    const hintLines = wrapText(ctx, input.labels.qrHint, 640).slice(0, 2);

    ctx.font = `400 26px ${body}`;
    ctx.fillStyle = MUTED;
    hintLines.forEach((line, index) => {
      ctx.fillText(line, PAD, qrY + 44 + index * 34, 640);
    });

    neonBar(ctx, PAD, qrY + 96, 600);

    ctx.font = `700 46px ${display}`;
    ctx.fillStyle = PAPER;
    ctx.fillText("OpenStage", PAD, qrY + 158, 600);
  } else {
    neonBar(ctx, PAD, height - PAD - 62, 340);

    ctx.font = `700 40px ${display}`;
    ctx.fillStyle = PAPER;
    ctx.fillText("OpenStage", PAD, height - PAD - 6, 340);
  }

  // Il motivo dell'annullamento, dove c'è spazio: sotto il dove, mai sopra il QR.
  if (input.cancelled && story) {
    const noteY = Math.min(y + 74, qrY - 96);
    const lines = wrapText(ctx, input.labels.cancelledNote, innerWidth - 40).slice(0, 2);

    ctx.font = `500 30px ${body}`;
    ctx.fillStyle = PINK;
    lines.forEach((line, index) => {
      ctx.fillText(line, PAD, noteY + index * 40, innerWidth - 40);
    });
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
