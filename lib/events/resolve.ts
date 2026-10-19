import { getEventById, getEventBySlug } from "./queries";
import type { PublicEvent } from "./types";

/**
 * Da un pezzo di indirizzo alla serata.
 *
 * Gli indirizzi possibili sono due:
 *   * `/eventi/<citta>/<slug>` — quello canonico, che finisce nel sitemap;
 *   * `/eventi/<identificativo>` (o `/eventi/<slug>`) — gli indirizzi storici,
 *     che i link già condivisi usano ancora.
 *
 * Sta qui e non nella pagina perché serve a **due** cose: la scheda e
 * l'immagine Open Graph che la rappresenta.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function findEventByPath(percorso: string[]): Promise<PublicEvent | null> {
  if (percorso.length === 1) {
    const [segmento] = percorso;
    // Identificativo oppure indirizzo leggibile: si accettano entrambi, così
    // anche chi digita `/eventi/sick-tamburo` arriva alla scheda giusta.
    return UUID.test(segmento) ? getEventById(segmento) : getEventBySlug(segmento);
  }

  if (percorso.length === 2) {
    return getEventBySlug(percorso[1]);
  }

  return null;
}
