import fs from "node:fs";

import sharp from "sharp";

/**
 * Copertine delle storie in evidenza di Instagram.
 *
 * Instagram le mostra dentro un cerchio: qui serve un simbolo grande e leggibile
 * a 100 px, non una locandina. Fondo del sito, slash del marchio, due lettere.
 *
 *   npm run highlights
 */

const OUT = "public/brand/highlights";

const COVERS = [
  { file: "bergamo.png", label: "BG", name: "Bergamo" },
  { file: "milano.png", label: "MI", name: "Milano" },
  { file: "live.png", label: "LIVE", name: "Serate" },
  { file: "info.png", label: "INFO", name: "Chi siamo" },
];

function svg(label) {
  const size = 1080;
  // Testo centrato: la dimensione scende se la parola è lunga (LIVE, INFO).
  const fontSize = label.length <= 2 ? 380 : 260;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="slash" x1="120" y1="1000" x2="960" y2="80" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#8B5CF6"/>
      <stop offset="1" stop-color="#22D3EE"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="62%">
      <stop offset="0" stop-color="#8B5CF6" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#07070D" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${size}" height="${size}" fill="#07070D"/>
  <rect width="${size}" height="${size}" fill="url(#glow)"/>

  <g opacity="0.55">
    <polygon points="700,980 860,980 960,100 800,100" fill="url(#slash)"/>
  </g>

  <text x="470" y="640" text-anchor="middle"
        font-family="Impact, 'Arial Black', 'Segoe UI Black', sans-serif"
        font-size="${fontSize}" font-weight="900" letter-spacing="${label.length <= 2 ? 8 : 4}"
        fill="#FFFFFF">${label}</text>

  <rect x="860" y="140" width="34" height="34" fill="#F472B6"/>
</svg>`;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  for (const cover of COVERS) {
    await sharp(Buffer.from(svg(cover.label)))
      .resize(1080, 1080)
      .png({ compressionLevel: 9 })
      .toFile(`${OUT}/${cover.file}`);
    console.log(`${cover.file} — ${cover.name}`);
  }
}

await main();
