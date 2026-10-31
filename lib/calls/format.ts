/** Formattazione condivisa della bacheca: periodo e scadenza. */

export function periodLabel(start: string | null, end: string | null, locale: string): string | null {
  if (!start && !end) return null;

  const format = (value: string) =>
    new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
      day: "2-digit",
      month: "short",
    }).format(new Date(`${value}T12:00:00`));

  if (start && end && end !== start) return `${format(start)} → ${format(end)}`;
  if (start) return format(start);
  return end ? format(end) : null;
}

export function shortDay(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}
