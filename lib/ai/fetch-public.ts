import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_URL_LENGTH = 2048;
const MAX_BYTES = 2_000_000;
const MAX_TEXT = 8000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isPrivateIpv6(address: string): boolean {
  const value = address.toLowerCase();
  return (
    value === "::1" ||
    value === "::" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80") ||
    value.startsWith("::ffff:127.") ||
    value.startsWith("::ffff:10.") ||
    value.startsWith("::ffff:192.168.")
  );
}

async function assertPublicUrl(raw: string): Promise<URL> {
  if (raw.length > MAX_URL_LENGTH) throw new Error("url_too_long");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid_url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid_protocol");
  if (url.username || url.password) throw new Error("credentials_not_allowed");
  if (!url.hostname || url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new Error("private_host");
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });

  if (addresses.length === 0) throw new Error("dns_failed");

  for (const entry of addresses) {
    if (isIP(entry.address) === 4 && isPrivateIpv4(entry.address)) throw new Error("private_host");
    if (isIP(entry.address) === 6 && isPrivateIpv6(entry.address)) throw new Error("private_host");
  }

  return url;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
}

/**
 * Legge una pagina pubblica per l'import evento.
 *
 * Solo http/https, niente IP privati/localhost, redirect limitati, timeout e
 * tetto di byte. Non invia cookie o credenziali: non legge pagine autenticate.
 */
export async function fetchPublicText(rawUrl: string): Promise<string> {
  let current = rawUrl;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const url = await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,text/plain;q=0.9",
          "User-Agent": "OpenStageBot/1.0 (+https://getopenstage.it)",
        },
        cache: "no-store",
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("redirect_without_location");
        current = new URL(location, url).toString();
        continue;
      }

      if (!response.ok) throw new Error(`http_${response.status}`);

      const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        throw new Error("unsupported_content_type");
      }

      if (!response.body) return "";

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel();
          throw new Error("response_too_large");
        }
        chunks.push(value);
      }

      const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
      const body = buffer.toString("utf8");

      return contentType.includes("text/plain") ? body.slice(0, MAX_TEXT).trim() : htmlToText(body);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("too_many_redirects");
}
