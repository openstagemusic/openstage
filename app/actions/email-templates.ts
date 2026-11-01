"use server";

import { revalidatePath } from "next/cache";

import { APP_FALLBACKS } from "@/lib/email/templates";
import { createClient } from "@/lib/supabase/server";

export type EmailTemplateActionResult = {
  ok: boolean;
  error?: "invalid" | "readonly" | "failed";
};

const MAX_SUBJECT = 160;
const MAX_BODY = 8000;

/**
 * Salva oggetto e corpo di un template modificabile.
 *
 * La RLS lascia scrivere solo all'admin e `editable` resta la stessa colonna che
 * la pagina legge: qui la ricontrolliamo, così una richiesta costruita a mano non
 * può cambiare i testi che il database compone da sé.
 */
export async function saveEmailTemplateAction(input: {
  slug: string;
  subjectIt: string;
  subjectEn: string;
  bodyIt: string;
  bodyEn: string;
}): Promise<EmailTemplateActionResult> {
  const subjectIt = input.subjectIt.trim();
  const subjectEn = input.subjectEn.trim();
  const bodyIt = input.bodyIt.trim();
  const bodyEn = input.bodyEn.trim();

  if (!subjectIt || !bodyIt) return { ok: false, error: "invalid" };
  if (subjectIt.length > MAX_SUBJECT || subjectEn.length > MAX_SUBJECT) {
    return { ok: false, error: "invalid" };
  }
  if (bodyIt.length > MAX_BODY || bodyEn.length > MAX_BODY) {
    return { ok: false, error: "invalid" };
  }

  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("email_templates")
    .select("editable")
    .eq("slug", input.slug)
    .maybeSingle();

  if (readError) {
    console.error("[email] save template (lettura):", readError.message);
    return { ok: false, error: "failed" };
  }

  if (!current) return { ok: false, error: "failed" };
  if (!current.editable) return { ok: false, error: "readonly" };

  const { error } = await supabase
    .from("email_templates")
    .update({
      subject_it: subjectIt,
      subject_en: subjectEn || null,
      body_it: bodyIt,
      body_en: bodyEn || null,
    })
    .eq("slug", input.slug);

  if (error) {
    console.error("[email] save template:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/email/catalogo");
  revalidatePath(`/admin/email/catalogo/${input.slug}`);

  return { ok: true };
}

/** Rimette il testo del codice: utile dopo una prova che non convince. */
export async function resetEmailTemplateAction(input: {
  slug: string;
}): Promise<EmailTemplateActionResult> {
  const fallback = APP_FALLBACKS[input.slug];
  if (!fallback) return { ok: false, error: "invalid" };

  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("email_templates")
    .select("editable")
    .eq("slug", input.slug)
    .maybeSingle();

  if (readError || !current) return { ok: false, error: "failed" };
  if (!current.editable) return { ok: false, error: "readonly" };

  const { error } = await supabase
    .from("email_templates")
    .update({
      subject_it: fallback.subjectIt,
      subject_en: fallback.subjectEn,
      body_it: fallback.bodyIt,
      body_en: fallback.bodyEn,
    })
    .eq("slug", input.slug);

  if (error) {
    console.error("[email] reset template:", error.message);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/admin/email/catalogo");
  revalidatePath(`/admin/email/catalogo/${input.slug}`);

  return { ok: true };
}
