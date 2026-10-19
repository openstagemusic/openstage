"use client";

import { createClient } from "@/lib/supabase/client";

import type { CoverErrorCode } from "./errors";

/**
 * Caricamento delle locandine su Supabase Storage.
 *
 * Perché il file parte dal browser e non dall'azione del server: le azioni del
 * server hanno un tetto sul corpo della richiesta, e la foto di un telefono lo
 * supera al primo scatto. Di qui il file va dritto all'archivio, e i limiti veri
 * (peso e tipo) li applica l'archivio stesso: le nostre prove servono solo a non
 * far perdere tempo a chi carica.
 *
 * La cartella di destinazione è `{profilo}/{uuid}`: la prima parte deve essere
 * il proprio `auth.uid()`, lo controlla la politica di scrittura. Nessuno può
 * sovrascrivere o cancellare la locandina di un altro, qualunque cosa arrivi da qui.
 */

export const COVER_BUCKET = "event-covers";
export const COVER_MAX_BYTES = 3 * 1024 * 1024;
/**
 * Oltre questo lato la foto viene ridimensionata: una locandina si guarda sullo
 * schermo, non si stampa, e un file leggero si carica anche con la linea debole
 * di un locale.
 */
export const COVER_MAX_SIDE = 1600;
export const COVER_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type CoverUploadResult = { ok: true; url: string } | { ok: false; error: CoverErrorCode };

function extensionFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";

  return "jpg";
}

function loadImage(source: Blob): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(source);
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

function canvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Ridimensiona e ricodifica.
 *
 * Il PNG resta PNG (la trasparenza non si butta per principio): diventa JPEG
 * solo se, anche ridimensionato, resta oltre il tetto di peso — a quel punto
 * vale più una locandina senza trasparenza che nessuna locandina.
 */
async function shrink(
  image: HTMLImageElement,
  sourceType: string
): Promise<{ blob: Blob; type: string } | null> {
  const scale = Math.min(1, COVER_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const keepPng = sourceType === "image/png";
  const blob = await canvasBlob(canvas, keepPng ? "image/png" : "image/jpeg", 0.9);

  if (blob && blob.size <= COVER_MAX_BYTES) {
    return { blob, type: keepPng ? "image/png" : "image/jpeg" };
  }

  const jpeg = await canvasBlob(canvas, "image/jpeg", 0.85);

  return jpeg ? { blob: jpeg, type: "image/jpeg" } : null;
}

async function put(blob: Blob, type: string): Promise<CoverUploadResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { ok: false, error: "uploadFailed" };

  const path = `${session.user.id}/${crypto.randomUUID()}.${extensionFor(type)}`;

  const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, blob, {
    contentType: type,
    // Il nome è unico e il file non cambia mai: si può tenere in cache a lungo.
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    console.error("[covers] upload:", error.message);
    return { ok: false, error: "uploadFailed" };
  }

  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);

  return { ok: true, url: data.publicUrl };
}

/**
 * Carica il file scelto.
 *
 * Se è già leggero e di dimensioni ragionevoli parte **così com'è**: nessuna
 * ricodifica, nessuna perdita di qualità. Si tocca solo quando serve davvero.
 */
export async function uploadCoverFile(file: File): Promise<CoverUploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: "type" };

  const image = await loadImage(file);
  if (!image) return { ok: false, error: "unreadable" };

  const tooHeavy =
    file.size > COVER_MAX_BYTES ||
    Math.max(image.naturalWidth, image.naturalHeight) > COVER_MAX_SIDE;

  if (!tooHeavy) return put(file, file.type);

  const shrunk = await shrink(image, file.type);
  if (!shrunk) return { ok: false, error: "unreadable" };
  if (shrunk.blob.size > COVER_MAX_BYTES) return { ok: false, error: "tooBig" };

  return put(shrunk.blob, shrunk.type);
}

/** Carica un'immagine disegnata da noi: la locandina generata dai dati. */
export async function uploadCoverBlob(blob: Blob, type = "image/jpeg"): Promise<CoverUploadResult> {
  if (blob.size > COVER_MAX_BYTES) return { ok: false, error: "tooBig" };

  return put(blob, type);
}
