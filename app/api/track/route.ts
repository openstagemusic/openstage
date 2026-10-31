import { createClient } from "@/lib/supabase/server";

/**
 * Contatore delle visualizzazioni.
 *
 * Cosa NON facciamo: salvare IP, user agent, cookie o identificativi. Il corpo
 * della richiesta contiene solo tipo e id della scheda; il database somma 1 al
 * giorno corrente. Una visita del proprietario della scheda viene ignorata
 * dentro `record_view()`, quindi i numeri non si gonfiano da soli.
 *
 * Perché un endpoint e non un'azione server: `sendBeacon` non deve aspettare la
 * risposta né far fallire la pagina. Qui rispondiamo sempre 204, anche quando
 * scartiamo la richiesta.
 */

const KINDS = new Set(["event", "artist", "venue", "epk"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT =
  /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|curl|wget|python-requests|axios|monitor/i;

const EMPTY = new Response(null, { status: 204 });

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";

  // Senza user agent è quasi sempre un client automatico; con "bot" nel nome
  // non è una persona che guarda una serata.
  if (!userAgent || BOT.test(userAgent)) return EMPTY;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return EMPTY;
  }

  const { kind, id } = (payload ?? {}) as { kind?: unknown; id?: unknown };

  if (typeof kind !== "string" || !KINDS.has(kind)) return EMPTY;
  if (typeof id !== "string" || !UUID.test(id)) return EMPTY;

  try {
    const supabase = await createClient();
    await supabase.rpc("record_view", { p_kind: kind, p_target: id });
  } catch {
    // Contare una visita non vale un errore in faccia a chi legge.
  }

  return EMPTY;
}
