#!/usr/bin/env node
/**
 * Generatore del manuale PDF di OpenStage.
 *
 * I sorgenti sono i file Markdown in docs/manuale (source of truth, versionati su
 * Git) + docs/manuale/meta.json (titolo, versione, data). Questo script li
 * trasforma in un unico PDF: copertina a colori + indice + capitoli.
 *
 * Uso:  npm run manuale
 *
 * Non fa parte della build di Next.js e non gira su Vercel: serve solo in locale.
 * Usa il Chrome/Edge già installato (nessun browser da scaricare).
 */
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";
import { PDFDocument } from "pdf-lib";
import puppeteer from "puppeteer-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "docs", "manuale");
const outFile = path.join(srcDir, "OpenStage-Manuale.pdf");

const meta = JSON.parse(await fs.readFile(path.join(srcDir, "meta.json"), "utf8"));
const previewHtml = path.join(srcDir, "anteprima.html");

/** Chrome/Edge installati: il primo che esiste vince (o OPENSTAGE_BROWSER). */
function findBrowser() {
  const candidates = [
    process.env.OPENSTAGE_BROWSER,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "Application", "chrome.exe"),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

/** Titolo e livelli dei capitoli, per l'indice generato automaticamente. */
function outline(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => /^(#{1,3})\s+(.+)$/.exec(line))
    .filter(Boolean)
    .map(([, hashes, text]) => ({ level: hashes.length, text: text.trim() }));
}

/**
 * Un file = uno o più capitoli: la pagina si spezza a ogni titolo di livello 1,
 * così l'indice e l'impaginazione restano leggibili senza doverlo curare a mano.
 */
function toSections(markdown) {
  const chunks = [];
  let current = [];

  for (const line of markdown.split(/\r?\n/)) {
    if (/^#\s+/.test(line) && current.some((l) => l.trim() !== "")) {
      chunks.push(current.join("\n"));
      current = [];
    }
    current.push(line);
  }
  if (current.some((l) => l.trim() !== "")) {
    chunks.push(current.join("\n"));
  }

  return chunks.map((chunk) => `<section class="chapter">${marked.parse(chunk)}</section>`);
}

const style = `
  @page { size: A4; margin: 20mm 18mm 20mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", "Inter", system-ui, -apple-system, sans-serif;
    font-size: 10.5pt; line-height: 1.55; color: #14141c; margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 {
    font-size: 21pt; line-height: 1.2; color: #5b21b6; margin: 0 0 14px;
    padding-bottom: 6px; border-bottom: 3px solid #22d3ee; letter-spacing: -0.3px;
  }
  h2 { font-size: 13.5pt; color: #111827; margin: 20px 0 6px; }
  h3 { font-size: 11.5pt; color: #4c1d95; margin: 14px 0 4px; }
  p, li { orphans: 2; widows: 2; }
  ul, ol { padding-left: 20px; }
  strong { color: #111827; }
  code {
    font-family: "Cascadia Mono", Consolas, monospace; font-size: 9.5pt;
    background: #f1f0fa; border: 1px solid #e3e1f5; border-radius: 3px; padding: 0 3px;
  }
  pre {
    background: #14141c; color: #e9e9f4; padding: 10px 12px; border-radius: 6px;
    font-size: 8.8pt; line-height: 1.4; white-space: pre-wrap; word-break: break-word;
    border-left: 3px solid #8b5cf6;
  }
  pre code { background: none; border: none; color: inherit; font-size: inherit; padding: 0; }
  blockquote {
    margin: 12px 0; padding: 8px 14px; background: #f4fdfe;
    border-left: 3px solid #22d3ee; border-radius: 0 6px 6px 0; color: #164e63;
  }
  blockquote p { margin: 0; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.3pt; }
  th {
    background: #6d28d9; color: #ffffff; text-align: left; font-weight: 600;
    padding: 6px 8px; border: 1px solid #5b21b6;
  }
  td { padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f8f8fc; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }
  h1, h2, h3 { break-after: avoid; }
  pre, blockquote { break-inside: avoid; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 18px 0; }
  a { color: #6d28d9; }
  .chapter { break-before: page; }
  .chapter:first-of-type { break-before: auto; }
  .lead { font-size: 11pt; color: #374151; }
  .toc { break-before: auto; }
  .toc h1 { border-bottom-color: #8b5cf6; }
  .toc ol { list-style: none; padding-left: 0; counter-reset: cap; }
  .toc > ol > li { counter-increment: cap; margin-top: 10px; font-size: 11.5pt; font-weight: 600; color: #5b21b6; }
  .toc > ol > li::before { content: counter(cap) ". "; }
  .toc ul { list-style: none; padding-left: 16px; margin: 4px 0 0; }
  .toc ul li { font-size: 10pt; font-weight: 400; color: #374151; margin: 2px 0; }
  .toc ul li::before { content: "· "; color: #22d3ee; font-weight: 700; }
  .meta-box {
    margin-top: 18px; border: 1px solid #e5e7eb; border-left: 4px solid #8b5cf6;
    border-radius: 6px; background: #faf9ff; padding: 10px 14px; font-size: 9.5pt; color: #374151;
  }
`;

function coverHtml() {
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
  .page {
    width: 210mm; height: 297mm; padding: 34mm 22mm 20mm;
    background: linear-gradient(160deg, #07070d 0%, #170b32 55%, #0d1b2e 100%);
    color: #ffffff; font-family: "Segoe UI", "Inter", system-ui, sans-serif;
    display: flex; flex-direction: column;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .brand { font-size: 15pt; letter-spacing: 3px; text-transform: uppercase; color: #a78bfa; }
  h1 { font-size: 40pt; line-height: 1.05; margin: 10mm 0 4mm; letter-spacing: -1px; }
  h1 span { background: linear-gradient(90deg, #8b5cf6, #22d3ee);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  h2 { font-size: 15pt; font-weight: 400; color: #cbd5e1; margin: 0 0 10mm; }
  .rule { height: 3px; width: 46mm; background: linear-gradient(90deg, #8b5cf6, #22d3ee); border-radius: 3px; }
  .info { margin-top: auto; font-size: 10.5pt; color: #e2e8f0; line-height: 1.9;
    border-top: 1px solid rgba(255,255,255,.14); padding-top: 6mm; }
  .info b { color: #22d3ee; font-weight: 600; }
  .nota { margin-top: 6mm; font-size: 8.5pt; color: #94a3b8; }
</style></head>
<body><div class="page">
  <div class="brand">${meta.titolo}</div>
  <h1>Manuale tecnico<br>e <span>guida utente</span></h1>
  <h2>${meta.sottotitolo}</h2>
  <div class="rule"></div>
  <div class="info">
    <div><b>Versione:</b> ${meta.versione}</div>
    <div><b>Data:</b> ${meta.data}</div>
    <div><b>Contenuto:</b> ${meta.copre}</div>
    <div class="nota">${meta.nota}</div>
  </div>
</div></body></html>`;
}

/** Corpo: indice automatico + capitoli, tutti i file .md in ordine di nome. */
async function buildBody() {
  const files = (await fs.readdir(srcDir))
    .filter((name) => name.endsWith(".md"))
    .sort();

  const chapters = [];
  const toc = [];

  for (const file of files) {
    const markdown = await fs.readFile(path.join(srcDir, file), "utf8");
    chapters.push(...toSections(markdown));
    toc.push(outline(markdown));
  }

  const tocHtml = toc
    .map((entries) => {
      const groups = [];
      let current = null;

      for (const entry of entries) {
        if (entry.level === 1) {
          current = { text: entry.text, sections: [] };
          groups.push(current);
        } else if (entry.level === 2 && current) {
          current.sections.push(entry.text);
        }
      }

      return groups
        .map((group) => {
          const sections = group.sections.length
            ? `<ul>${group.sections.map((s) => `<li>${s}</li>`).join("")}</ul>`
            : "";
          return `<li>${group.text}${sections}</li>`;
        })
        .join("");
    })
    .join("");

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><style>${style}</style></head>
<body>
  <section class="toc">
    <h1>Indice</h1>
    <ol>${tocHtml}</ol>
    <div class="meta-box">
      ${meta.titolo} · ${meta.sottotitolo} · versione ${meta.versione} (${meta.data})<br>
      Il PDF viene rigenerato dai file Markdown in <code>docs/manuale/</code> con
      <code>npm run manuale</code>.
    </div>
  </section>
  ${chapters.join("\n")}
</body></html>`;
}

const browserPath = findBrowser();
if (!browserPath) {
  console.error(
    "Nessun browser trovato per generare il PDF.\n" +
      "Installa Google Chrome oppure indica il percorso con la variabile OPENSTAGE_BROWSER."
  );
  process.exit(1);
}

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openstage-manuale-"));
const coverPdf = path.join(tmpDir, "copertina.pdf");
const bodyPdf = path.join(tmpDir, "corpo.pdf");

const browser = await puppeteer.launch({ executablePath: browserPath, headless: true });
try {
  const page = await browser.newPage();
  const bodyHtml = await buildBody();

  // Con `npm run manuale -- --anteprima` scrive anche l'HTML: utile per controllare
  // l'impaginazione nel browser senza rigenerare il PDF.
  if (process.argv.includes("--anteprima")) {
    await fs.writeFile(previewHtml, bodyHtml, "utf8");
    console.log(`· anteprima HTML: ${path.relative(root, previewHtml)}`);
  }

  await page.setContent(coverHtml(), { waitUntil: "load" });
  await page.pdf({ path: coverPdf, format: "A4", printBackground: true });
  console.log("· copertina generata");

  await page.setContent(bodyHtml, { waitUntil: "load" });
  await page.pdf({
    path: bodyPdf,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `
      <div style="width:100%;font-size:7.6pt;color:#6b7280;padding:0 18mm;
                  display:flex;justify-content:space-between;font-family:'Segoe UI',sans-serif;">
        <span>${meta.titolo} · ${meta.sottotitolo} · v${meta.versione}</span>
        <span>Pagina <span class="pageNumber"></span> di <span class="totalPages"></span></span>
      </div>`,
    margin: { top: "16mm", bottom: "16mm", left: "18mm", right: "18mm" },
  });
  console.log("· indice e capitoli generati");
} finally {
  await browser.close();
}

const merged = await PDFDocument.create();
for (const file of [coverPdf, bodyPdf]) {
  const doc = await PDFDocument.load(await fs.readFile(file));
  const pages = await merged.copyPages(doc, doc.getPageIndices());
  pages.forEach((p) => merged.addPage(p));
}
merged.setTitle(`${meta.titolo} — ${meta.sottotitolo} v${meta.versione}`);
merged.setAuthor(meta.titolo);
merged.setSubject(meta.copre);
await fs.writeFile(outFile, await merged.save());

await fs.rm(tmpDir, { recursive: true, force: true });

const { size } = await fs.stat(outFile);
console.log(
  `✓ Manuale pronto: ${path.relative(root, outFile)} (${merged.getPageCount()} pagine, ${Math.round(
    size / 1024
  )} KB)`
);
