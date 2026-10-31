import fs from "node:fs";
import path from "node:path";

import puppeteer from "puppeteer-core";

/**
 * Smoke test del sito pubblico.
 *
 * Non prova a fare login né a pubblicare: quelle sono le prove a mano del beta
 * test. Qui si controlla una cosa sola, ma su tutto: che le pagine pubbliche
 * rispondano, abbiano un titolo, un `h1`, la lingua giusta e **nessun errore**
 * in console (idratazione compresa). È il test che deve restare verde su ogni
 * deploy.
 *
 * Uso:
 *   node scripts/smoke.mjs                      → http://localhost:3000
 *   BASE_URL=https://getopenstage.it node scripts/smoke.mjs
 *
 * Variabili: BASE_URL, CHROME_PATH (facoltativa), SMOKE_TIMEOUT_MS (facoltativa).
 */

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const TIMEOUT = Number(process.env.SMOKE_TIMEOUT_MS ?? 45_000);

const PUBLIC_PAGES = [
  "/it",
  "/en",
  "/it/mappa",
  "/it/citta",
  "/it/artisti",
  "/it/locali",
  "/it/calls",
  "/it/per-gli-artisti",
  "/it/per-le-venue",
  "/it/about",
  "/it/contatti",
  "/it/aiuto",
  "/it/playlists",
  "/it/privacy",
  "/it/terms",
  "/it/cookies",
  "/it/notice-takedown",
  "/it/login",
  "/it/register",
  "/it/forgot-password",
];

/** Rumore che non dipende da noi (Turnstile in headless, estensioni, rete). */
const IGNORED_CONSOLE = [
  "challenges.cloudflare.com",
  "Failed to load resource",
  "net::ERR_",
  "favicon",
  // Turnstile "prova" le API della console stampando messaggi con i segnaposto
  // `%c`: in headless arrivano qui come errori. Non sono nostri.
  "font-size:0;color:transparent",
];

function isIgnored(text) {
  return text.startsWith("%c") || IGNORED_CONSOLE.some((ignored) => text.includes(ignored));
}

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const candidates =
    process.platform === "win32"
      ? [
          "C:/Program Files/Google/Chrome/Application/chrome.exe",
          "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
          "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        ]
      : [
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
        ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      "Chrome non trovato: passa CHROME_PATH (es. CHROME_PATH=/usr/bin/google-chrome)."
    );
  }
  return found;
}

const results = [];
let failed = 0;

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failed += 1;
}

async function fetchText(url, init) {
  const response = await fetch(url, { redirect: "manual", ...init });
  const text = response.status >= 300 && response.status < 400 ? "" : await response.text();
  return { response, text };
}

async function checkStatic() {
  // robots.txt e sitemap: se spariscono, Google non trova più le schede.
  const robots = await fetchText(`${BASE_URL}/robots.txt`);
  record("robots.txt", robots.response.status === 200 && /sitemap:/i.test(robots.text));

  const sitemap = await fetchText(`${BASE_URL}/sitemap.xml`);
  const sitemapOk = sitemap.response.status === 200 && sitemap.text.includes("<urlset");
  record("sitemap.xml", sitemapOk);

  const locs = sitemapOk
    ? [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
    : [];

  const kinds = ["/eventi/", "/citta/", "/artisti/", "/locali/", "/aiuto/"];
  for (const kind of kinds) {
    const found = locs.find((loc) => loc.includes(kind) && !loc.endsWith(kind));
    record(`sitemap ${kind}`, Boolean(found), found ?? "nessun indirizzo");
  }

  // La vecchia FAQ deve portare al centro assistenza, con un redirect permanente.
  const faq = await fetch(`${BASE_URL}/it/faq`, { redirect: "manual" });
  const location = faq.headers.get("location") ?? "";
  record(
    "redirect /it/faq",
    [301, 307, 308].includes(faq.status) && location.includes("/aiuto"),
    `${faq.status} → ${location}`
  );

  // Header di sicurezza sulle pagine normali.
  const home = await fetch(`${BASE_URL}/it`, { redirect: "manual" });
  const headers = home.headers;
  record("/it risponde", home.status === 200, String(home.status));
  record("header nosniff", headers.get("x-content-type-options") === "nosniff");
  record("header referrer-policy", Boolean(headers.get("referrer-policy")));
  record("header permissions-policy", Boolean(headers.get("permissions-policy")));
  record("header x-frame-options", headers.get("x-frame-options") === "DENY");

  return locs;
}

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];

  page.on("pageerror", (error) => errors.push(`pageerror: ${String(error).slice(0, 200)}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (isIgnored(text)) return;
    errors.push(`console: ${text.slice(0, 200)}`);
  });

  return { page, errors };
}

async function checkPage(browser, pathname, { expectLang, mustContain } = {}) {
  const { page, errors } = await newPage(browser);
  const url = `${BASE_URL}${pathname}`;

  try {
    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: TIMEOUT });
    const info = await page.evaluate(() => ({
      title: document.title.trim(),
      lang: document.documentElement.lang,
      h1: document.querySelectorAll("h1").length,
      text: document.body.innerText.slice(0, 4000),
      hasUndefined: /undefined undefined|NaN|\[object Object\]/.test(document.body.innerText),
    }));

    const problems = [];
    if (!response || response.status() >= 400) problems.push(`stato ${response?.status()}`);
    if (info.title.length < 5) problems.push("titolo mancante");
    if (info.h1 !== 1) problems.push(`${info.h1} h1`);
    if (expectLang && info.lang !== expectLang) problems.push(`lang=${info.lang}`);
    if (info.hasUndefined) problems.push("testo con undefined/NaN");
    if (mustContain && !info.text.includes(mustContain)) problems.push(`manca «${mustContain}»`);
    if (errors.length) problems.push(...errors.slice(0, 2));

    record(pathname, problems.length === 0, problems.join(" · "));
  } catch (error) {
    record(pathname, false, String(error).slice(0, 200));
  } finally {
    await page.close();
  }
}

async function checkOpenGraph(browser, pathname) {
  // La card social è un'immagine generata: se cade, ogni link condiviso diventa grigio.
  const { page, errors } = await newPage(browser);
  try {
    await page.goto(`${BASE_URL}${pathname}`, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    const meta = await page.evaluate(() => {
      const el = document.querySelector('meta[property="og:image"]');
      return el?.getAttribute("content") ?? null;
    });

    if (!meta) {
      record(`og:image ${pathname}`, false, "meta assente");
      return;
    }

    const image = await fetch(meta);
    const type = image.headers.get("content-type") ?? "";
    record(
      `og:image ${pathname}`,
      image.ok && type.includes("image"),
      `${image.status} ${type}`
    );
    if (errors.length) record(`console ${pathname}`, false, errors[0]);
  } catch (error) {
    record(`og:image ${pathname}`, false, String(error).slice(0, 200));
  } finally {
    await page.close();
  }
}

async function main() {
  console.log(`Smoke test su ${BASE_URL}\n`);

  const locs = await checkStatic();

  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    for (const pathname of PUBLIC_PAGES) {
      await checkPage(browser, pathname, {
        expectLang: pathname.startsWith("/en") ? "en" : pathname.startsWith("/it") ? "it" : undefined,
      });
    }

    // Le schede vere, prese dalla sitemap: se non ci sono ancora, si salta.
    for (const kind of ["/eventi/", "/citta/", "/artisti/", "/locali/", "/aiuto/"]) {
      const loc = locs.find((item) => item.includes(kind) && !item.endsWith(kind));
      if (!loc) continue;
      const pathname = new URL(loc).pathname;
      await checkPage(browser, pathname);
    }

    const firstEvent = locs.find((item) => item.includes("/eventi/") && !item.endsWith("/eventi/"));
    if (firstEvent) await checkOpenGraph(browser, new URL(firstEvent).pathname);
  } finally {
    await browser.close();
  }

  const width = Math.max(...results.map((item) => item.name.length)) + 2;
  for (const item of results) {
    const mark = item.ok ? "OK  " : "FAIL";
    console.log(`${mark} ${item.name.padEnd(width)} ${item.detail}`);
  }

  console.log(`\n${results.length - failed}/${results.length} controlli superati.`);
  if (failed > 0) process.exit(1);
}

await main();
