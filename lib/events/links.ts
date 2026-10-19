/**
 * Controllo del link dei biglietti.
 *
 * Perché serve: il link dei biglietti è l'unica porta che porta **fuori** dal
 * sito, ed è quella che si preme quando si è già decisi a uscire. Un 404 lì è
 * una serata persa per chi organizzava e una figuraccia per chi la pubblicava.
 *
 * Come si fa, però, è la parte delicata. I siti di biglietteria sono lenti,
 * proteggono i bot e rispondono in modi diversi: un controllo troppo severo
 * bloccherebbe salvataggi legittimi — e l'utente non capirebbe perché.
 *
 * Quindi la regola è asimmetrica e volutamente indulgente:
 *
 *   * **404 / 410** → il link è morto, si blocca il salvataggio;
 *   * tutto il resto (403, 405, 429, redirect, timeout, host che non risponde)
 *     → non è una prova che sia morto: si salva lo stesso.
 *
 * Meglio un link forse rotto che un salvataggio rifiutato per colpa di un
 * controllo che non sa distinguere un sito lento da un sito chiuso.
 */

/** Quanto si aspetta prima di rinunciare (e lasciar passare). */
const TIMEOUT_MS = 3000;

export async function isTicketUrlReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "OpenStage link check (+https://openstage.vercel.app)" },
    });

    // Solo i due codici che dicono «qui non c'è più niente».
    return response.status !== 404 && response.status !== 410;
  } catch {
    // Nessuna risposta, o un certificato storto: non è una prova di morte.
    return true;
  } finally {
    clearTimeout(timer);
  }
}
