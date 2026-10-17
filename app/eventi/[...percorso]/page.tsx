import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import EventPageView from "@/components/events/EventPageView";
import { eventMetadata } from "@/lib/events/metadata";
import { eventPath } from "@/lib/events/paths";
import { getEventById, getEventBySlug } from "@/lib/events/queries";
import type { PublicEvent } from "@/lib/events/types";
import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";

/**
 * Scheda pubblica dell'evento — **una sola rotta per tutti gli indirizzi**.
 *
 * Gli indirizzi possibili sono due:
 *   * `/eventi/<citta>/<slug>` — quello canonico, che finisce nel sitemap;
 *   * `/eventi/<identificativo>` — quello storico, che esisteva prima delle
 *     schede con indirizzo leggibile e che i link già condivisi usano ancora.
 *
 * Stanno in un'unica rotta con cattura multipla perché in Next due segmenti
 * dinamici fratelli non possono avere nomi diversi (`[id]` contro `[citta]`):
 * il server si avviava ma ogni richiesta a `/eventi/...` finiva in errore 500.
 * Con un solo punto d'ingresso la regola "un evento, un indirizzo" è anche più
 * semplice da leggere.
 */

type EventPageProps = {
  params: Promise<{ percorso: string[] }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findEvent(percorso: string[]): Promise<PublicEvent | null> {
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

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { percorso } = await params;
  const event = await findEvent(percorso);

  return event ? eventMetadata(event) : {};
}

export default async function EventPage({ params }: EventPageProps) {
  const { percorso } = await params;
  const event = await findEvent(percorso);

  if (!event) notFound();

  // Un confronto solo copre tutti i casi: identificativo, città sbagliata,
  // indirizzo più corto del dovuto.
  //
  // Chi arriva da un indirizzo non canonico viene portato a quello giusto con
  // `permanentRedirect` — Next risponde **308**, che per i motori di ricerca vale
  // come il 301: consolidano tutti sull'indirizzo definitivo. La lingua si
  // rimette nel reindirizzamento (`withLocale`), altrimenti il secondo salto lo
  // farebbe il middleware e chi è arrivato su `/it/…` potrebbe finire su `/en/…`.
  const canonico = eventPath(event);
  if (canonico !== `/eventi/${percorso.join("/")}`) {
    const locale = await getLocale();
    permanentRedirect(withLocale(locale, canonico));
  }

  return <EventPageView event={event} />;
}
