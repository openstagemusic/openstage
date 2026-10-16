/**
 * Date "di calendario" nel fuso di riferimento della piattaforma.
 *
 * I filtri rapidi (stasera, questo weekend, questa settimana…) sono confini di
 * giornata, e una giornata non dura sempre 24 ore: la conversione passa da
 * `Intl` invece che da somme di millisecondi, così il cambio di ora legale non
 * sposta la finestra di un'ora.
 */

/** Fuso di riferimento dei filtri rapidi (la piattaforma è italo-centrica). */
export const FILTER_TIMEZONE = "Europe/Rome";

export type CalendarDate = { year: number; month: number; day: number };

function parts(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
}

/** Scostamento del fuso, in minuti verso est, in quell'istante. */
function offsetMinutes(instant: Date, timeZone: string): number {
  const list = parts(instant, timeZone);
  const read = (type: string) => Number(list.find((part) => part.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") % 24,
    read("minute"),
    read("second")
  );

  return (asUtc - instant.getTime()) / 60_000;
}

/** Istante UTC corrispondente a una data/ora **locale** del fuso indicato. */
export function zonedInstant(
  date: CalendarDate & { hour?: number },
  timeZone = FILTER_TIMEZONE
): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day, date.hour ?? 0);
  const firstTry = new Date(guess - offsetMinutes(new Date(guess), timeZone) * 60_000);

  // Il secondo passaggio sistema i giorni in cui cambia l'ora legale.
  return new Date(guess - offsetMinutes(firstTry, timeZone) * 60_000);
}

/** Data di calendario dell'istante, nel fuso indicato. */
export function calendarDate(instant: Date, timeZone = FILTER_TIMEZONE): CalendarDate {
  const list = parts(instant, timeZone);
  const read = (type: string) => Number(list.find((part) => part.type === type)?.value ?? "0");

  return { year: read("year"), month: read("month"), day: read("day") };
}

/** Aggiunge giorni a una data di calendario: solo aritmetica, nessun fuso. */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** 0 = domenica … 6 = sabato. */
export function weekday(date: CalendarDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}
