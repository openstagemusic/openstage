const RESEND_ENDPOINT = "https://api.resend.com/emails";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Invio sincrono con Resend.
 *
 * Non lancia mai verso chi compila un modulo: un problema del provider non deve
 * far perdere il messaggio già scritto nel database. Restituisce `false` e
 * logga l'errore, così il chiamante decide se mostrare un avviso.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "OpenStage <noreply@getopenstage.it>";

  if (!apiKey) {
    console.error("[email] RESEND_API_KEY non configurata");
    return false;
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        reply_to: input.replyTo,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[email] Resend", response.status, body.slice(0, 300));
      return false;
    }

    return true;
  } catch (error) {
    console.error("[email] send failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

type ContactNotification = {
  name: string;
  email: string;
  topic: string;
  message: string;
  locale: string;
};

/** Avvisa la casella ufficiale che è arrivato un messaggio dal form contatti. */
export async function sendContactNotification(input: ContactNotification): Promise<boolean> {
  const inbox = process.env.EMAIL_REPLY_TO?.trim() || "ciao@getopenstage.it";
  const subject = `[OpenStage] Contatto — ${input.topic}`;
  const text = [
    `Nuovo messaggio dal form contatti`,
    ``,
    `Nome: ${input.name}`,
    `Email: ${input.email}`,
    `Tema: ${input.topic}`,
    `Lingua: ${input.locale}`,
    ``,
    input.message,
  ].join("\n");

  const html = `
    <h2>Nuovo messaggio dal form contatti</h2>
    <p><strong>Nome:</strong> ${escapeHtml(input.name)}<br>
    <strong>Email:</strong> ${escapeHtml(input.email)}<br>
    <strong>Tema:</strong> ${escapeHtml(input.topic)}<br>
    <strong>Lingua:</strong> ${escapeHtml(input.locale)}</p>
    <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(input.message)}</pre>
  `;

  return sendEmail({
    to: inbox,
    subject,
    text,
    html,
    replyTo: input.email,
  });
}

/** Risposta 1:1 dell'admin, con la casella ufficiale come reply-to. */
export async function sendContactReply(input: {
  to: string;
  name: string;
  topic: string;
  body: string;
}): Promise<boolean> {
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || "ciao@getopenstage.it";
  const subject = `Re: OpenStage — ${input.topic}`;
  const text = [`Ciao ${input.name},`, ``, input.body, ``, `OpenStage`].join("\n");
  const html = `
    <p>Ciao ${escapeHtml(input.name)},</p>
    <p style="white-space:pre-wrap">${escapeHtml(input.body)}</p>
    <p>OpenStage</p>
  `;

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
    replyTo,
  });
}
