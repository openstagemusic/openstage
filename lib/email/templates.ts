import { createAdminClient } from "@/lib/supabase/admin";

/**
 * I testi delle email, letti dal catalogo (`email_templates`).
 *
 * Perché passare dal database: il tono di una risposta assistenza o di un
 * avviso legale cambia senza dover fare un deploy, e chi scrive i testi non deve
 * aprire il codice. Il codice resta comunque la rete di sicurezza: se la tabella
 * non risponde, si usa il testo di `APP_FALLBACKS`, identico a quello di prima.
 *
 * La lettura usa la chiave di servizio: i testi non sono pubblici e le email
 * partono dal server, anche quando chi scrive è anonimo (modulo contatti).
 */

export type EmailTemplateSource = "app" | "queue" | "supabase";

export type EmailTemplate = {
  slug: string;
  name: string;
  category: "auth" | "transactional" | "digest" | "system";
  source: EmailTemplateSource;
  audience: string;
  trigger: string;
  variables: string[];
  subjectIt: string | null;
  subjectEn: string | null;
  bodyIt: string | null;
  bodyEn: string | null;
  note: string | null;
  editable: boolean;
  position: number;
  updatedAt: string;
};

type TemplateRow = {
  slug: string;
  name: string;
  category: "auth" | "transactional" | "digest" | "system";
  source: EmailTemplateSource;
  audience: string;
  trigger_label: string;
  variables: string[] | null;
  subject_it: string | null;
  subject_en: string | null;
  body_it: string | null;
  body_en: string | null;
  note: string | null;
  editable: boolean;
  position: number;
  updated_at: string;
};

function toTemplate(row: TemplateRow): EmailTemplate {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    source: row.source,
    audience: row.audience,
    trigger: row.trigger_label,
    variables: row.variables ?? [],
    subjectIt: row.subject_it,
    subjectEn: row.subject_en,
    bodyIt: row.body_it,
    bodyEn: row.body_en,
    note: row.note,
    editable: row.editable,
    position: row.position,
    updatedAt: row.updated_at,
  };
}

const SELECT =
  "slug, name, category, source, audience, trigger_label, variables, subject_it, subject_en, body_it, body_en, note, editable, position, updated_at";

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select(SELECT)
    .order("position", { ascending: true });

  if (error) {
    console.error("[email] listEmailTemplates:", error.message);
    return [];
  }

  return ((data as TemplateRow[] | null) ?? []).map(toTemplate);
}

export async function getEmailTemplate(slug: string): Promise<EmailTemplate | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[email] getEmailTemplate:", error.message);
    return null;
  }

  return data ? toTemplate(data as TemplateRow) : null;
}

/** `{{chiave}}` → valore. Le variabili mancanti diventano stringa vuota. */
export function renderTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] ?? "");
}

/** Testo semplice → HTML: paragrafi, a capo conservati, niente markup. */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p style="white-space:pre-wrap">${escapeHtml(block)}</p>`)
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type RenderedEmail = { subject: string; text: string; html: string };

/**
 * Testi di riserva, identici a quelli che erano nel codice prima del catalogo.
 * Servono se la tabella non risponde: un guasto al database non deve fermare le
 * email di assistenza.
 */
export const APP_FALLBACKS: Record<
  string,
  { subjectIt: string; subjectEn: string; bodyIt: string; bodyEn: string }
> = {
  "app-contact-admin": {
    subjectIt: "[OpenStage] Contatto — {{topic}}",
    subjectEn: "[OpenStage] Contact — {{topic}}",
    bodyIt: `Nuovo messaggio dal form contatti

Nome: {{name}}
Email: {{email}}
Tema: {{topic}}
Lingua: {{locale}}

{{message}}`,
    bodyEn: `New message from the contact form

Name: {{name}}
Email: {{email}}
Topic: {{topic}}
Language: {{locale}}

{{message}}`,
  },
  "app-contact-reply": {
    subjectIt: "Re: OpenStage — {{topic}}",
    subjectEn: "Re: OpenStage — {{topic}}",
    bodyIt: `Ciao {{name}},

{{body}}

OpenStage`,
    bodyEn: `Hi {{name}},

{{body}}

OpenStage`,
  },
  "app-takedown-admin": {
    subjectIt: "[OpenStage] Notice & takedown - {{type}}",
    subjectEn: "[OpenStage] Notice & takedown - {{type}}",
    bodyIt: `Nuova notice & takedown

ID: {{noticeId}}
Tipo: {{type}}
Nome: {{reporterName}}
Email: {{reporterEmail}}
{{organization}}Contenuto: {{targetUrl}}
Lingua: {{locale}}

{{description}}`,
    bodyEn: `New notice & takedown

ID: {{noticeId}}
Type: {{type}}
Name: {{reporterName}}
Email: {{reporterEmail}}
{{organization}}Content: {{targetUrl}}
Language: {{locale}}

{{description}}`,
  },
  "app-takedown-received": {
    subjectIt: "OpenStage - Notice & takedown ricevuto",
    subjectEn: "OpenStage - Notice & takedown received",
    bodyIt: `Ciao {{name}},

abbiamo ricevuto la tua segnalazione (ID {{noticeId}}).
La esamineremo e ti risponderemo a questo indirizzo.

OpenStage`,
    bodyEn: `Hi {{name}},

we received your notice (ID {{noticeId}}).
We will review it and reply to this address.

OpenStage`,
  },
  "app-takedown-outcome": {
    subjectIt: "OpenStage - Esito notice & takedown",
    subjectEn: "OpenStage - Notice & takedown outcome",
    bodyIt: `Ciao {{name}},

Riferimento: {{noticeId}}
{{outcome}}
{{action}}

OpenStage`,
    bodyEn: `Hi {{name}},

Reference: {{noticeId}}
{{outcome}}
{{action}}

OpenStage`,
  },
};

/**
 * Prepara oggetto, testo e HTML di un'email dell'app.
 *
 * Ordine di preferenza: catalogo → testo di riserva. Non lancia mai: un'email
 * che parte con il testo di riserva è meglio di un'email che non parte.
 */
export async function prepareAppEmail(
  slug: keyof typeof APP_FALLBACKS | string,
  locale: string,
  variables: Record<string, string>
): Promise<RenderedEmail> {
  const fallback = APP_FALLBACKS[slug];
  const english = locale === "en";

  let subject = english ? fallback?.subjectEn : fallback?.subjectIt;
  let body = english ? fallback?.bodyEn : fallback?.bodyIt;

  try {
    const template = await getEmailTemplate(slug);
    if (template) {
      const dbSubject = english ? template.subjectEn : template.subjectIt;
      const dbBody = english ? template.bodyEn : template.bodyIt;
      if (dbSubject?.trim()) subject = dbSubject;
      if (dbBody?.trim()) body = dbBody;
    }
  } catch (error) {
    console.error("[email] template non letto:", slug, error instanceof Error ? error.message : error);
  }

  // Ultima rete: se manca anche il testo di riserva, almeno qualcosa parte.
  const finalSubject = renderTemplate(subject ?? "OpenStage", variables).trim();
  const finalBody = renderTemplate(body ?? "", variables);

  return {
    subject: finalSubject,
    text: finalBody,
    html: textToHtml(finalBody),
  };
}
