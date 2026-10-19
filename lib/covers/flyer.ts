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
 * Quello che esce da qui **non finisce sulla scheda dell'evento**: è un'immagine
 * da scaricare e condividere, e si disegna al momento. La foto che si vede sulla
 * scheda è un'altra cosa, e la carica chi organizza (vedi `lib/covers/upload.ts`).
 *
 * Le matite (foto, aloni, testo) stanno in `canvas.ts`: sono le stesse delle
 * Share Card.
 */

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
  roundRect,
  waitForFonts,
  type CanvasPhoto,
} from "./canvas";

export const FLYER_WIDTH = 1080;
export const FLYER_HEIGHT = 1350;

const PAD = 64;
const PHOTO = { x: PAD, y: PAD, width: FLYER_WIDTH - PAD * 2, height: 640 };

/**
 * La foto della locandina.
 *
 * Un `Blob` è il file scelto adesso nel modulo (sta in memoria, si disegna
 * subito); una stringa è l'indirizzo dell'immagine già salvata, che si rilegge
 * dall'archivio quando si genera la locandina in un secondo momento.
 */
export type FlyerPhoto = CanvasPhoto;

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
  photo: FlyerPhoto | null;
};

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
  await waitForFonts(display, body, 84);

  const canvas = document.createElement("canvas");
  canvas.width = FLYER_WIDTH;
  canvas.height = FLYER_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const photo = input.photo ? await loadPhoto(input.photo) : null;

  // --- Fondo: scuro, con due aloni neon ------------------------------------
  drawGlows(ctx, FLYER_WIDTH, FLYER_HEIGHT);

  // --- La foto --------------------------------------------------------------
  drawPhoto(ctx, photo, PHOTO.x, PHOTO.y, PHOTO.width, PHOTO.height, 28, () => {
    neonWall(ctx, PHOTO.x, PHOTO.y, PHOTO.width, PHOTO.height);

    ctx.font = `700 92px ${display}`;
    ctx.fillStyle = PAPER;
    ctx.textAlign = "center";
    ctx.fillText(
      input.kind.toUpperCase(),
      FLYER_WIDTH / 2,
      PHOTO.y + PHOTO.height / 2 + 32,
      840
    );
    ctx.textAlign = "left";
  });

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

    ctx.fillStyle = PAPER;
    ctx.textAlign = "center";
    ctx.fillText(label, FLYER_WIDTH - PAD - width / 2, rowY, width - 24);
    ctx.textAlign = "left";
  }

  // --- Titolo, e poi quando e dove -----------------------------------------
  const fitted = fitTitle(ctx, title, innerWidth, 3, display);
  const lineHeight = Math.round(fitted.size * 1.08);
  let y = rowY + 68 + fitted.size;

  ctx.font = `700 ${fitted.size}px ${display}`;
  ctx.fillStyle = PAPER;

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
  ctx.fillStyle = PAPER;
  ctx.fillText("OpenStage", PAD, FLYER_HEIGHT - PAD);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}
