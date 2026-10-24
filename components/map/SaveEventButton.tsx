"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleSavedEvent } from "@/app/actions/saved";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { withLocale } from "@/lib/i18n/locale-path";
import { cn } from "@/lib/utils";

type SaveEventButtonProps = {
  eventId: string;
  /** Indirizzo a cui tornare dopo l'accesso (quello canonico dell'evento). */
  nextPath?: string;
  initiallySaved: boolean;
  isAuthenticated: boolean;
  labels: { save: string; saved: string; loginToSave: string; pending: string };
  className?: string;
};

/**
 * Salva l'evento nei preferiti del profilo (tabella `saved_events`, protetta
 * da RLS). Se non c'è una sessione il pulsante porta al login: nessun
 * salvataggio finto lato client.
 */
export default function SaveEventButton({
  eventId,
  nextPath,
  initiallySaved,
  isAuthenticated,
  labels,
  className,
}: SaveEventButtonProps) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const locale = useLocale();

  // Il ritorno al login conserva la lingua e la pagina dell'evento.
  const loginHref = withLocale(
    locale,
    `/login?next=${encodeURIComponent(withLocale(locale, nextPath ?? `/eventi/${eventId}`))}`
  );

  const onClick = () => {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }

    startTransition(async () => {
      const result = await toggleSavedEvent(eventId);
      if (result.requiresAuth) {
        router.push(loginHref);
        return;
      }
      if (result.ok) setSaved(result.saved);
    });
  };

  const label = pending ? labels.pending : !isAuthenticated ? labels.loginToSave : saved ? labels.saved : labels.save;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      className={cn(
        "inline-flex items-center gap-2 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors disabled:opacity-60",
        saved
          ? "border-pink/50 bg-pink/10 text-white"
          : "border-line text-muted hover:border-line-strong hover:text-white",
        className
      )}
    >
      <span aria-hidden="true">{saved ? "★" : "☆"}</span>
      {label}
    </button>
  );
}
