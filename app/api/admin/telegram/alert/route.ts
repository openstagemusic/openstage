import { NextResponse, type NextRequest } from "next/server";

import { sendTelegramMessage, telegramSecret } from "@/lib/telegram";

/**
 * Ponte tra il database e Telegram.
 *
 * I trigger Supabase chiamano questa rotta con `x-telegram-secret`. Il token
 * del bot non viene mai restituito: serve solo a firmare la chiamata e a
 * inviare il messaggio. La rotta è server-only e non accetta testo libero
 * oltre i limiti.
 */
export async function POST(request: NextRequest) {
  const secret = telegramSecret();
  const header = request.headers.get("x-telegram-secret");

  if (!secret || header !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: { text?: unknown };

  try {
    payload = (await request.json()) as { text?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (typeof payload.text !== "string" || payload.text.trim().length === 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await sendTelegramMessage(payload.text);

  return NextResponse.json(
    { ok: result.ok },
    { status: result.ok ? 200 : result.error === "not_configured" ? 503 : 502 }
  );
}
