/**
 * Telegram lato server, su due canali separati:
 * - `admin`: code della control room;
 * - `activity`: nuove registrazioni e nuovi eventi.
 *
 * Token e chat restano nelle variabili d'ambiente di Vercel: il browser non li
 * vede mai. I messaggi non contengono dati personali.
 */

export type TelegramChannel = "admin" | "activity";

const CONFIG: Record<TelegramChannel, { token?: string; chat?: string }> = {
  admin: {
    token: process.env.TELEGRAM_BOT_TOKEN?.trim(),
    chat: process.env.TELEGRAM_ADMIN_CHAT_ID?.trim(),
  },
  activity: {
    token: process.env.TELEGRAM_ACTIVITY_BOT_TOKEN?.trim(),
    chat: process.env.TELEGRAM_ACTIVITY_CHAT_ID?.trim(),
  },
};

export type TelegramResult = { ok: boolean; error?: "not_configured" | "failed" };

export function isTelegramConfigured(channel: TelegramChannel = "admin"): boolean {
  const config = CONFIG[channel];
  return Boolean(config.token && config.chat);
}

export function telegramSecret(channel: TelegramChannel = "admin"): string | null {
  return CONFIG[channel].token ?? null;
}

export async function sendTelegramMessage(
  text: string,
  channel: TelegramChannel = "admin"
): Promise<TelegramResult> {
  const config = CONFIG[channel];
  if (!config.token || !config.chat) return { ok: false, error: "not_configured" };

  const body = text.trim();
  if (body.length === 0 || body.length > 900) return { ok: false, error: "failed" };

  try {
    const response = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chat,
        text: body,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[telegram:${channel}] send failed:`, response.status);
      return { ok: false, error: "failed" };
    }

    const payload = (await response.json()) as { ok?: boolean };
    return payload.ok === true ? { ok: true } : { ok: false, error: "failed" };
  } catch (error) {
    console.error(
      `[telegram:${channel}] send:`,
      error instanceof Error ? error.message : error
    );
    return { ok: false, error: "failed" };
  }
}
