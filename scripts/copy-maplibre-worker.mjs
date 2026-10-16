/**
 * Copia il worker di MapLibre in `public/`.
 *
 * MapLibre GL JS (v6) tiene il worker in un file separato che i bundler non
 * risolvono da soli: servendolo dalla nostra origine la mappa funziona in
 * sviluppo e in produzione, senza dipendere da CDN esterne.
 *
 * Gira automaticamente dopo `npm install` e prima di `npm run build`.
 */
import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const target = resolve(root, "public/maplibre-gl-worker.mjs");

try {
  await stat(source);
} catch {
  console.error(
    "[map] Worker di MapLibre non trovato: hai installato le dipendenze? (npm install)"
  );
  process.exit(1);
}

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log("[map] Worker di MapLibre copiato in public/maplibre-gl-worker.mjs");
