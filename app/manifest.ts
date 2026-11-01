import type { MetadataRoute } from "next";

/**
 * Manifest dell'app (Android, aggiunta alla schermata Home).
 *
 * Le icone sono generate da `npm run icons` a partire dal marchio: 192 e 512,
 * più la variante `maskable` che Android può ritagliare a cerchio.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenStage — live indipendente",
    short_name: "OpenStage",
    description:
      "La mappa gratuita del live indipendente: artisti emergenti, locali di zona e serate vere.",
    start_url: "/",
    display: "standalone",
    background_color: "#07070D",
    theme_color: "#07070D",
    lang: "it",
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
