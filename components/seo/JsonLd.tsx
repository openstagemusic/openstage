import { jsonLd } from "@/lib/seo/jsonld";

/**
 * Dati strutturati per i motori di ricerca.
 *
 * Renderizzati dal server insieme alla pagina: nessun JavaScript necessario
 * perché Google li veda.
 */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Il JSON è già neutralizzato (`<` → `\u003c`) in `jsonLd`.
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}
