"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleSavedEvent } from "@/app/actions/saved";
import { cn } from "@/lib/utils";

type SaveEventButtonProps = {
  eventId: string;
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
  initiallySaved,
  isAuthenticated,
  labels,
  className,
}: SaveEventButtonProps) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/eventi/${eventId}`)}`);
      return;
    }

    startTransition(async () => {
      const result = await toggleSavedEvent(eventId);
      if (result.requiresAuth) {
        router.push(`/login?next=${encodeURIComponent(`/eventi/${eventId}`)}`);
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
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60",
        saved
          ? "border-pink/50 bg-pink/10 text-white"
          : "border-white/15 text-muted hover:border-white/25 hover:text-white",
        className
      )}
    >
      <span aria-hidden="true">{saved ? "★" : "☆"}</span>
      {label}
    </button>
  );
}
