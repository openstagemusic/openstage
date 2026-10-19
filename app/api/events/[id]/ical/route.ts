import { buildIcs } from "@/lib/events/calendar";
import { eventPath } from "@/lib/events/paths";
import { getEventById } from "@/lib/events/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * "Aggiungi al calendario" senza passare da nessun servizio.
 *
 * Il file `.ics` è testo: si costruisce qui e si scarica. Il telefono lo apre
 * nell'app calendario, il computer lo dà a Outlook o Apple Calendario.
 *
 * La lingua (per descrizione e ingresso gratuito) è quella con cui si sta
 * guardando il sito. Sul filesystem non finisce niente: nessun file temporaneo,
 * nessun archivio da pulire.
 */

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  // Stessa visibilità della scheda: pubblicati e annullati. Le bozze non
  // esistono per chi non è dentro la dashboard, quindi qui non si trovano.
  const event = await getEventById(id);

  if (!event) {
    return new Response("Non trovato", { status: 404 });
  }

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const url = absoluteUrl(`/${locale}${eventPath(event)}`);

  const body = buildIcs(event, url, { free: dict.events.freeEntry });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug || event.id}.ics"`,
      // Un download personale: niente copie in cache condivise.
      "Cache-Control": "no-store",
    },
  });
}
