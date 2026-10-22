"use server";

import { redirect } from "next/navigation";

import { withLocale } from "@/lib/i18n/locale-path";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

const TOPICS = new Set(["general", "artist", "venue", "report", "privacy", "other"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Il modulo contatti è pubblico e scrive nel database.
 *
 * Non ci sono servizi email in questa fase: il messaggio resta in
 * `contact_messages`, dove l'admin lo legge. La validazione qui è la stessa
 * dei vincoli della tabella; il database resta comunque l'ultima autorità.
 */
export async function submitContact(formData: FormData): Promise<never> {
  const locale = await getLocale();

  const fail = (code: string): never => {
    redirect(withLocale(locale, `/contatti?errore=${code}`));
  };

  // Honeypot: un campo che una persona non vede e non compila. Se arriva pieno,
  // fingiamo successo per non dare indizi ai bot.
  if (text(formData, "website")) {
    redirect(withLocale(locale, "/contatti?stato=inviato"));
  }

  const name = text(formData, "name");
  const email = text(formData, "email");
  const topic = text(formData, "topic");
  const message = text(formData, "message");

  if (
    name.length < 2 ||
    name.length > 80 ||
    email.length > 160 ||
    !EMAIL_PATTERN.test(email) ||
    message.length < 10 ||
    message.length > 4000 ||
    !TOPICS.has(topic)
  ) {
    fail("campi");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    topic,
    message,
    locale,
  });

  if (error) {
    console.error("[contact] insert:", error.message);
    fail("invio");
  }

  redirect(withLocale(locale, "/contatti?stato=inviato"));
}
