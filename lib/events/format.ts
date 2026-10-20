/**
 * Formattazione di date e orari.
 *
 * L'ora mostrata è quella **del luogo dell'evento** (`events.timezone`, IANA),
 * non quella del dispositivo: un concerto alle 21:30 a Milano resta alle 21:30
 * anche se lo guardi da un altro fuso.
 */

export type EventDateParts = {
  /** "ven 24 ott" */
  date: string;
  /** "21:30" */
  time: string;
  /** "ven 24 ott · 21:30" */
  full: string;
  /** true se l'evento cade nel giorno locale corrente dell'evento */
  isToday: boolean;
  /** true se l'evento cade domani (giorno locale dell'evento) */
  isTomorrow: boolean;
};

function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);
}

export function formatEventDate(
  startsAt: string,
  timezone: string,
  locale: string,
  now: Date = new Date()
): EventDateParts {
  const date = new Date(startsAt);
  const zone = timezone || "Europe/Rome";

  const datePart = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: zone,
  }).format(date);

  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
  }).format(date);

  const today = dayKey(now, zone);
  const tomorrow = dayKey(new Date(now.getTime() + 86_400_000), zone);
  const eventDay = dayKey(date, zone);

  return {
    date: datePart,
    time: timePart,
    full: `${datePart} · ${timePart}`,
    isToday: eventDay === today,
    isTomorrow: eventDay === tomorrow,
  };
}

/**
 * La serata è di un giorno già passato, nel fuso dell'evento.
 *
 * Non registriamo l'ora di fine: una serata resta "in programma" per tutto il
 * giorno in cui si tiene (un concerto delle 21:30 non diventa "concluso" alle
 * 21:31) e passa tra le passate solo dal giorno dopo.
 */
export function isEventPast(
  startsAt: string,
  timezone: string | null,
  now: Date = new Date()
): boolean {
  const zone = timezone || "Europe/Rome";

  return dayKey(new Date(startsAt), zone) < dayKey(now, zone);
}

/** Data estesa con anno, usata nella pagina dell'evento. */
export function formatEventDateLong(
  startsAt: string,
  timezone: string,
  locale: string
): string {
  const date = new Date(startsAt);
  const zone = timezone || "Europe/Rome";

  const day = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: zone,
  }).format(date);

  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
  }).format(date);

  return `${day} · ${time}`;
}

/** Nome del fuso orario dell'evento (es. "Ora dell'Europa centrale"). */
export function timeZoneName(timezone: string, locale: string): string {
  try {
    return (
      new Intl.DateTimeFormat(locale, { timeZone: timezone, timeZoneName: "long" })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value ?? timezone
    );
  } catch {
    return timezone;
  }
}
