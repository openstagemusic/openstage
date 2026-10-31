"use client";

import { deleteAllNotificationsAction } from "@/app/actions/notifications";
import TrashIcon from "@/components/notifications/TrashIcon";

/**
 * Svuota lo storico delle notifiche.
 *
 * Chiede conferma prima: è l'unica azione della pagina che non si può annullare.
 */
export default function DeleteAllNotificationsButton({
  label,
  confirmLabel,
}: {
  label: string;
  confirmLabel: string;
}) {
  return (
    <form
      action={deleteAllNotificationsAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmLabel)) event.preventDefault();
      }}
    >
      <button
        type="submit"
        className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-pink"
      >
        <TrashIcon className="h-3.5 w-3.5" />
        {label}
      </button>
    </form>
  );
}
