import type { NextConfig } from "next";

/**
 * Header di sicurezza.
 *
 * Non c'è una CSP completa: Next inietta script inline e una policy rigida
 * senza nonce romperebbe l'idratazione. Quelli che seguono sono i divieti che
 * non hanno controindicazioni e che un browser applica senza fidarsi del codice:
 *
 * - `nosniff`: un file caricato non può cambiare tipo per finta.
 * - `Referrer-Policy`: quando si esce verso un locale o un social, non si porta
 *   dietro l'indirizzo completo della pagina.
 * - `Permissions-Policy`: microfono, fotocamera e pagamenti non ci servono.
 *   La posizione sì (la mappa ha «usa la mia posizione»), quindi resta a `self`.
 *
 * Il divieto di incorniciamento (`X-Frame-Options`) sta nel middleware, perché
 * i widget (`/widget/...`) devono invece poter vivere dentro un `<iframe>` sul
 * sito di un locale o di un artista.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), geolocation=(self), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
