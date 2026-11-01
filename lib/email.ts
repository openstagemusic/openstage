import { prepareAppEmail } from "@/lib/email/templates";
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
  const email = await prepareAppEmail("app-contact-admin", input.locale, {
    name: input.name,
    email: input.email,
    topic: input.topic,
    message: input.message,
    locale: input.locale,
  });

  return sendEmail({
    to: inbox,
    subject: email.subject,
    text: email.text,
    html: email.html,
    replyTo: input.email,
  });
}

/** Risposta 1:1 dell'admin, con la casella ufficiale come reply-to. */
export async function sendContactReply(input: {
  to: string;
  name: string;
  topic: string;
  body: string;
  /** Lingua in cui scrivere: quella del ticket, così la risposta non cambia lingua. */
  locale?: string;
}): Promise<boolean> {
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || "ciao@getopenstage.it";
  const email = await prepareAppEmail("app-contact-reply", input.locale ?? "it", {
    name: input.name,
    body: input.body,
    topic: input.topic,
  });

  return sendEmail({
    to: input.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
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
  const email = await prepareAppEmail("app-takedown-admin", input.locale, {
    noticeId: input.noticeId,
    type: input.type,
    reporterName: input.reporterName,
    reporterEmail: input.reporterEmail,
    organization: input.organization ? `Organizzazione: ${input.organization}\n` : "",
    targetUrl: input.targetUrl,
    description: input.description,
    locale: input.locale,
  });

  return sendEmail({ to: inbox, subject: email.subject, text: email.text, html: email.html });
}

/** Conferma al segnalante che la richiesta è stata registrata. */
export async function sendTakedownAcknowledgement(input: {
  to: string;
  name: string;
  noticeId: string;
  locale: string;
}): Promise<boolean> {
  const email = await prepareAppEmail("app-takedown-received", input.locale, {
    name: input.name,
    noticeId: input.noticeId,
  });

  return sendEmail({ to: input.to, subject: email.subject, text: email.text, html: email.html });
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
  const outcome = italian
    ? input.status === "actioned"
      ? "La segnalazione è stata accolta e il contenuto è stato rimosso o modificato."
      : "La segnalazione è stata esaminata e non è stato possibile accoglierla."
    : input.status === "actioned"
      ? "Your notice was accepted and the content was removed or changed."
      : "Your notice was reviewed and could not be accepted.";

  const email = await prepareAppEmail("app-takedown-outcome", input.locale, {
    name: input.name,
    noticeId: input.noticeId,
    outcome,
    action:
      input.status === "actioned" && input.action
        ? `${italian ? "Azione" : "Action"}: ${input.action}`
        : "",
  });

  return sendEmail({ to: input.to, subject: email.subject, text: email.text, html: email.html });
}
