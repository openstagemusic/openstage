import { NextResponse, type NextRequest } from "next/server";

import { sendTelegramMessage, telegramSecret } from "@/lib/telegram";

/**
 * Ponte tra il database e il bot "activity".
 *
 * Solo registrazioni ed eventi: il token del secondo bot non viene mai
 * restituito, serve a firmare la chiamata e a inviare il messaggio.
 */
export async function POST(request: NextRequest) {
  const secret = telegramSecret("activity");
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

  const result = await sendTelegramMessage(payload.text, "activity");

  return NextResponse.json(
    { ok: result.ok },
    { status: result.ok ? 200 : result.error === "not_configured" ? 503 : 502 }
  );
}
