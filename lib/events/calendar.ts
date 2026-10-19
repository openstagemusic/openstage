import { isCancelled, placeName, type PublicEvent } from "./types";

/**
 * La serata nel calendario di chi la guarda.
 *
 * Due strade, stesso contenuto: il file `.ics` (Apple Calendario, Outlook, i
 * telefoni) e il link "Aggiungi a Google Calendar" per chi usa il calendario di
 * Google nel browser. Le date si scrivono in **UTC** (`...Z`): il calendario del
 * telefono le riporta da solo nel fuso di chi guarda, e non c'è modo di sbagliare
 * l'ora legale.
 *
 * Un evento non ha un'ora di fine: si mettono tre ore, la durata tipica di una
 * serata. Meglio un blocco leggermente lungo che un evento che "finisce" mentre
 * suona ancora l'ultimo pezzo.
 */

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

export type CalendarLabels = {
  /** "Ingresso gratuito" — finisce nel corpo dell'evento. */
  free: string;
};

/** Formato compatto delle date iCalendar: `20261108T203000Z`. */
function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Il testo dentro un `.ics`: virgole, punti e virgola e a capo hanno un
 * significato, quindi vanno protetti. Senza, un titolo come "Jazz, funk & soul"
 * spezzerebbe l'evento in due.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Le righe di un `.ics` non possono superare i 75 byte: si spezzano e si
 * continua con uno spazio. Senza, Outlook scarta il file.
 */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 73) return line;

  const out: string[] = [];
  let current = "";
  let bytes = 0;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 73) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  out.push(current);

  return out.join("\r\n ");
}

/** Dove si va: locale, indirizzo, città. Gli approssimativi restano città. */
export function calendarLocation(event: PublicEvent): string {
  const address = event.venue?.address ?? null;
  const city = event.city;
  const parts: (string | null)[] = [placeName(event), address];

  // Molti indirizzi contengono già la città: ripeterla fa solo rumore nel
  // calendario ("… Ranica BG, Ranica").
  if (city && !address?.toLowerCase().includes(city.toLowerCase())) parts.push(city);

  return parts.filter(Boolean).join(", ");
}

/** Cosa si legge nel calendario: descrizione, prezzo, link alla scheda. */
function calendarDetails(event: PublicEvent, url: string, labels: CalendarLabels): string {
  const price = event.isFree ? labels.free : event.priceText;

  return [event.description?.trim(), price, url].filter(Boolean).join("\n\n");
}

/** Il link "Aggiungi a Google Calendar". */
export function googleCalendarUrl(
  event: PublicEvent,
  url: string,
  labels: CalendarLabels
): string {
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: calendarDetails(event, url, labels),
    location: calendarLocation(event),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Il file `.ics` completo.
 *
 * `STATUS:CANCELLED` quando la serata è saltata: chi l'aveva già messa in
 * calendario e riscarica il file la vede sparire, invece di presentarsi davanti
 * a un portone chiuso. Il resto dei campi resta, perché il file deve poter
 * cancellare l'evento giusto (stesso `UID`).
 */
export function buildIcs(
  event: PublicEvent,
  url: string,
  labels: CalendarLabels,
  now: Date = new Date()
): string {
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OpenStage//Eventi//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@openstage`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(calendarDetails(event, url, labels))}`,
    `LOCATION:${escapeText(calendarLocation(event))}`,
    `URL:${escapeText(url)}`,
    `STATUS:${isCancelled(event) ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(fold).join("\r\n")}\r\n`;
}
