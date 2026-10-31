import type { Dictionary } from "@/i18n/dictionaries/en";
import type { BookingStatus } from "@/lib/booking/queries";

/**
 * Etichetta e colore dello stato. Uno solo posto: la stessa parola e lo stesso
 * colore valgono nella inbox e nel thread.
 */
export function bookingStatusMeta(
  status: BookingStatus | null | undefined,
  dict: Dictionary["booking"]
): { label: string; className: string } {
  switch (status) {
    case "confirmed":
      return { label: dict.statusConfirmed, className: "text-cyan" };
    case "declined":
      return { label: dict.statusDeclined, className: "text-pink" };
    case "archived":
      return { label: dict.statusArchived, className: "text-muted" };
    case "open":
      return { label: dict.statusOpen, className: "text-violet" };
    default:
      return { label: dict.statusNew, className: "text-white" };
  }
}
