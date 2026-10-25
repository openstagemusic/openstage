/**
 * Telegram lato server.
 *
 * Il token e la chat restano nelle variabili d'ambiente di Vercel: il browser
 * non li vede mai. I messaggi non contengono dati personali, solo il tipo di
 * evento e il link alla control room.
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

export type TelegramResult = { ok: boolean; error?: "not_configured" | "failed" };

export function isTelegramConfigured(): boolean {
  return Boolean(TOKEN && CHAT_ID);
}

export function telegramSecret(): string | null {
  return TOKEN ?? null;
}

export async function sendTelegramMessage(text: string): Promise<TelegramResult> {
  if (!TOKEN || !CHAT_ID) return { ok: false, error: "not_configured" };

  const body = text.trim();
  if (body.length === 0 || body.length > 900) return { ok: false, error: "failed" };

  try {
    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: body,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[telegram] send failed:", response.status);
      return { ok: false, error: "failed" };
    }

    const payload = (await response.json()) as { ok?: boolean };
    return payload.ok === true ? { ok: true } : { ok: false, error: "failed" };
  } catch (error) {
    console.error("[telegram] send:", error instanceof Error ? error.message : error);
    return { ok: false, error: "failed" };
  }
}
