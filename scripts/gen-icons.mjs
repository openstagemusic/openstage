import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

/**
 * Icone del sito, generate dal marchio.
 *
 * Il marchio sta in `public/brand/openstage-favicon.svg` (512×512, fondo
 * #07070D): da lì si ricavano tutte le misure che servono, così non esistono
 * cinque file diversi da tenere allineati a mano.
 *
 *   npm run icons
 *
 * Produce:
 *   app/icon.png              512  icona della scheda del browser
 *   app/apple-icon.png        180  icona su iPhone/iPad (aggiunta alla Home)
 *   public/favicon.ico        256  per i browser e i lettori che lo chiedono
 *   public/brand/icon-192.png      manifest (Android)
 *   public/brand/icon-512.png      manifest (Android, schermo intero)
 *   public/brand/openstage-avatar-512.png  immagine profilo per il mittente email
 */

const SOURCE = "public/brand/openstage-favicon.svg";
const AVATAR = "public/brand/openstage-avatar-512.png";

function icoFromPng(png, size = 256) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // riservato
  header.writeUInt16LE(1, 2); // tipo: icona
  header.writeUInt16LE(1, 4); // una sola immagine

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 = 256
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // riservato
  entry.writeUInt16LE(1, 4); // piani
  entry.writeUInt16LE(32, 6); // bit per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(6 + 16, 12); // offset dei dati

  return Buffer.concat([header, entry, png]);
}

async function png(size) {
  return sharp(SOURCE).resize(size, size, { fit: "cover" }).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  for (const file of ["app/icon.png", "app/apple-icon.png", "public/favicon.ico"]) {
    if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  fs.writeFileSync("app/icon.png", await png(512));
  fs.writeFileSync("app/apple-icon.png", await png(180));
  fs.writeFileSync("public/brand/icon-192.png", await png(192));
  fs.writeFileSync("public/brand/icon-512.png", await png(512));
  fs.writeFileSync(AVATAR, await png(512));
  fs.writeFileSync("public/favicon.ico", icoFromPng(await png(256)));

  console.log("Icone generate: app/icon.png, app/apple-icon.png, public/favicon.ico, public/brand/icon-192.png, public/brand/icon-512.png, " + AVATAR);
}

await main();
