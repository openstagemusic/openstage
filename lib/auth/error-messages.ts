import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Supabase Auth risponde in inglese e con messaggi tecnici ("Invalid login credentials",
 * "User already registered"). Qui i casi che un utente incontra davvero vengono tradotti;
 * tutto il resto resta com'è: meglio un messaggio tecnico che un messaggio sbagliato.
 */
export function authErrorMessage(message: string, dict: Dictionary["auth"]): string {
  const testo = message.toLowerCase();

  if (testo.includes("already registered") || testo.includes("user_already_exists")) {
    return dict.errors.alreadyRegistered;
  }

  if (testo.includes("invalid login credentials")) {
    return dict.errors.invalidCredentials;
  }

  if (testo.includes("email not confirmed")) {
    return dict.errors.emailNotConfirmed;
  }

  if (testo.includes("rate limit") || testo.includes("too many requests")) {
    return dict.errors.tooManyAttempts;
  }

  if (testo.includes("captcha")) {
    return dict.errors.captcha;
  }

  return message;
}
