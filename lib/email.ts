const RESEND_ENDPOINT = "https://api.resend.com/emails";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Override per il worker; di default usa `EMAIL_FROM`. */
  from?: string;
};

export type SendEmailResult = {
  ok: boolean;
  id?: string;
  error?: string;
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
export async function sendEmailDetailed(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = input.from?.trim() || process.env.EMAIL_FROM?.trim() || "OpenStage <noreply@getopenstage.it>";

  if (!apiKey) {
    console.error("[email] RESEND_API_KEY non configurata");
    return { ok: false, error: "missing_api_key" };
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
      return { ok: false, error: `resend_${response.status}` };
    }

    const payload = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: payload.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[email] send failed:", message);
    return { ok: false, error: message };
  }
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  return (await sendEmailDetailed(input)).ok;
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

type TakedownNotification = {
  noticeId: string;
  type: string;
  reporterName: string;
  reporterEmail: string;
  organization: string | null;
  targetUrl: string;
  description: string;
  locale: string;
};

/** Avvisa la casella ufficiale che è arrivata una notice & takedown. */
export async function sendTakedownNotification(input: TakedownNotification): Promise<boolean> {
  const inbox = process.env.EMAIL_REPLY_TO?.trim() || "ciao@getopenstage.it";
  const subject = `[OpenStage] Notice & takedown - ${input.type}`;
  const text = [
    "Nuova notice & takedown",
    "",
    `ID: ${input.noticeId}`,
    `Tipo: ${input.type}`,
    `Nome: ${input.reporterName}`,
    `Email: ${input.reporterEmail}`,
    input.organization ? `Organizzazione: ${input.organization}` : null,
    `Contenuto: ${input.targetUrl}`,
    `Lingua: ${input.locale}`,
    "",
    input.description,
  ].filter((line): line is string => line !== null).join("\n");

  const html = `
    <h2>Nuova notice &amp; takedown</h2>
    <p><strong>ID:</strong> ${escapeHtml(input.noticeId)}<br>
    <strong>Tipo:</strong> ${escapeHtml(input.type)}<br>
    <strong>Nome:</strong> ${escapeHtml(input.reporterName)}<br>
    <strong>Email:</strong> ${escapeHtml(input.reporterEmail)}<br>
    ${input.organization ? `<strong>Organizzazione:</strong> ${escapeHtml(input.organization)}<br>` : ""}
    <strong>Contenuto:</strong> ${escapeHtml(input.targetUrl)}<br>
    <strong>Lingua:</strong> ${escapeHtml(input.locale)}</p>
    <p style="white-space:pre-wrap">${escapeHtml(input.description)}</p>
  `;

  return sendEmail({ to: inbox, subject, text, html });
}

/** Conferma al segnalante che la richiesta è stata registrata. */
export async function sendTakedownAcknowledgement(input: {
  to: string;
  name: string;
  noticeId: string;
  locale: string;
}): Promise<boolean> {
  const italian = input.locale !== "en";
  const subject = italian
    ? "OpenStage - Notice & takedown ricevuto"
    : "OpenStage - Notice & takedown received";
  const text = italian
    ? [
        `Ciao ${input.name},`,
        "",
        `abbiamo ricevuto la tua segnalazione (ID ${input.noticeId}).`,
        "La esamineremo e ti risponderemo a questo indirizzo.",
        "",
        "OpenStage",
      ].join("\n")
    : [
        `Hi ${input.name},`,
        "",
        `we received your notice (ID ${input.noticeId}).`,
        "We will review it and reply to this address.",
        "",
        "OpenStage",
      ].join("\n");

  return sendEmail({
    to: input.to,
    subject,
    text,
    html: `<p style="white-space:pre-wrap">${escapeHtml(text)}</p>`,
  });
}

/** Comunica al segnalante l'esito della decisione. */
export async function sendTakedownOutcome(input: {
  to: string;
  name: string;
  noticeId: string;
  status: "actioned" | "rejected";
  action: string | null;
  locale: string;
}): Promise<boolean> {
  const italian = input.locale !== "en";
  const subject = italian
    ? "OpenStage - Esito notice & takedown"
    : "OpenStage - Notice & takedown outcome";
  const outcome = italian
    ? input.status === "actioned"
      ? "La segnalazione è stata accolta e il contenuto è stato rimosso o modificato."
      : "La segnalazione è stata esaminata e non è stato possibile accoglierla."
    : input.status === "actioned"
      ? "Your notice was accepted and the content was removed or changed."
      : "Your notice was reviewed and could not be accepted.";
  const text = [
    italian ? `Ciao ${input.name},` : `Hi ${input.name},`,
    "",
    `${italian ? "Riferimento" : "Reference"}: ${input.noticeId}`,
    outcome,
    input.status === "actioned" && input.action ? `${italian ? "Azione" : "Action"}: ${input.action}` : "",
    "",
    "OpenStage",
  ].filter(Boolean).join("\n");

  return sendEmail({
    to: input.to,
    subject,
    text,
    html: `<p style="white-space:pre-wrap">${escapeHtml(text)}</p>`,
  });
}
