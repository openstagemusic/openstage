import { addDays, calendarDate, FILTER_TIMEZONE, zonedDateTime, zonedInstant } from "./timezone";
import { EVENT_KINDS, type EventKind, type LocationPrecision } from "./types";

/**
 * Regole dell'editor degli eventi.
 *
 * Vivono fuori dal modulo per un motivo preciso: le stesse regole devono valere
 * quando i dati arrivano da un'altra strada (correzioni dell'admin, importazioni
 * future). La RLS decide *chi* può scrivere; qui si decide *cosa* è scritto bene.
 *
 * Gli errori sono **codici**, non frasi: la traduzione sta nei dizionari, così
 * l'italiano e l'inglese non possono divergere da ciò che il database accetta.
 */

export const TITLE_MAX = 120;
export const TITLE_MIN = 3;
export const GENRE_MAX = 60;
export const DESCRIPTION_MAX = 2000;
export const CITY_MAX = 80;
export const VENUE_NAME_MAX = 120;
export const PRICE_MAX = 40;
export const URL_MAX = 300;
/**
 * La locandina è più larga degli altri indirizzi: quelle caricate da noi stanno
 * in Supabase Storage e portano dietro il nome del file, e restano valide anche
 * le locandine esterne già presenti nei primi eventi inseriti.
 */
export const COVER_URL_MAX = 500;

/** Fusi orari proposti dal modulo (l'ora legale la calcola `Intl`). */
export const TIMEZONE_OPTIONS = [
  "Europe/Rome",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Athens",
  "UTC",
] as const;

/** Ampiezza dell'area quando la posizione è indicata come zona, non come punto. */
export const RADIUS_OPTIONS_M = [500, 1500, 3000] as const;
export const DEFAULT_RADIUS_M = 1500;

export const EDITOR_FIELDS = [
  "title",
  "kind",
  "genre",
  "date",
  "time",
  "timezone",
  "venueId",
  "venueName",
  "city",
  "location",
  "priceText",
  "ticketUrl",
  "coverImageUrl",
  "description",
] as const;

export type EditorField = (typeof EDITOR_FIELDS)[number];

export type EditorErrorCode =
  | "titleRequired"
  | "titleTooLong"
  | "kindInvalid"
  | "genreTooLong"
  | "dateRequired"
  | "dateInvalid"
  | "timeRequired"
  | "timeInvalid"
  | "timezoneInvalid"
  | "venueInvalid"
  | "venueNameTooLong"
  | "cityRequired"
  | "cityTooLong"
  | "locationRequired"
  | "priceTooLong"
  | "ticketInvalid"
  | "coverInvalid"
  | "descriptionTooLong";

export type EditorErrors = Partial<Record<EditorField, EditorErrorCode>>;

/** Cosa contiene il modulo, mentre l'utente lo compila. */
export type EventEditorState = {
  title: string;
  kind: EventKind;
  genre: string;
  description: string;
  /** Data locale `AAAA-MM-GG`. */
  date: string;
  /** Ora locale `HH:MM`. */
  time: string;
  timezone: string;
  venueId: string;
  venueName: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: LocationPrecision;
  areaRadiusM: number;
  isFree: boolean;
  priceText: string;
  ticketUrl: string;
  /** Indirizzo della locandina: si riempie caricando un file, non si incolla. */
  coverImageUrl: string;
};

/** Cosa si scrive davvero nella tabella `events`. */
export type EventEditorValues = {
  title: string;
  kind: EventKind;
  genre: string | null;
  description: string | null;
  startsAt: string;
  timezone: string;
  venueId: string | null;
  venueName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: LocationPrecision;
  areaRadiusM: number | null;
  isFree: boolean;
  priceText: string | null;
  ticketUrl: string | null;
  coverImageUrl: string | null;
};

export type ValidationResult =
  | { ok: true; values: EventEditorValues }
  | { ok: false; errors: EditorErrors };

type CalendarParts = { year: number; month: number; day: number };

function parseDate(value: string): CalendarParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };

  // Il 31 febbraio non esiste: la data deve tornare indietro identica.
  const check = new Date(Date.UTC(date.year, date.month - 1, date.day));
  const real =
    check.getUTCFullYear() === date.year &&
    check.getUTCMonth() === date.month - 1 &&
    check.getUTCDate() === date.day;

  if (!real) return null;
  if (date.year < 2000 || date.year > 2100) return null;

  return date;
}

function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) return null;

  return { hour, minute };
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isCoordinate(value: number | null, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

/** Un evento è valido se ha un titolo, un quando e un dove. Tutto il resto è di contorno. */
export function validateEventInput(input: EventEditorState): ValidationResult {
  const errors: EditorErrors = {};

  const title = input.title.trim();
  if (title.length < TITLE_MIN) errors.title = "titleRequired";
  else if (title.length > TITLE_MAX) errors.title = "titleTooLong";

  if (!EVENT_KINDS.includes(input.kind)) errors.kind = "kindInvalid";

  const genre = input.genre.trim();
  if (genre.length > GENRE_MAX) errors.genre = "genreTooLong";

  const date = parseDate(input.date);
  if (!date) errors.date = input.date.trim() === "" ? "dateRequired" : "dateInvalid";

  const time = parseTime(input.time);
  if (!time) errors.time = input.time.trim() === "" ? "timeRequired" : "timeInvalid";

  const timezone = input.timezone.trim() || FILTER_TIMEZONE;
  if (!isValidTimezone(timezone)) errors.timezone = "timezoneInvalid";

  let startsAt: string | null = null;
  if (date && time && !errors.timezone) {
    const instant = zonedInstant({ ...date, ...time }, timezone);
    startsAt = Number.isFinite(instant.getTime()) ? instant.toISOString() : null;
    if (!startsAt) errors.date = "dateInvalid";
  }

  const venueId = input.venueId.trim();
  const hasVenue = venueId !== "";
  if (hasVenue && !isUuid(venueId)) errors.venueId = "venueInvalid";

  const venueName = input.venueName.trim();
  if (!hasVenue && venueName.length > VENUE_NAME_MAX) errors.venueName = "venueNameTooLong";

  const city = input.city.trim();
  if (city.length > CITY_MAX) errors.city = "cityTooLong";
  // Con un locale collegato la città arriva dalla sua scheda: chiederla due
  // volte sarebbe un modo di far sbagliare.
  else if (city === "" && !hasVenue) errors.city = "cityRequired";

  const latitude = input.latitude;
  const longitude = input.longitude;
  const hasPoint = isCoordinate(latitude, 90) && isCoordinate(longitude, 180);
  if (!hasPoint) errors.location = "locationRequired";

  const priceText = input.priceText.trim();
  if (priceText.length > PRICE_MAX) errors.priceText = "priceTooLong";

  const ticketUrl = input.ticketUrl.trim();
  if (ticketUrl.length > URL_MAX || (ticketUrl !== "" && !isHttpUrl(ticketUrl))) {
    errors.ticketUrl = "ticketInvalid";
  }

  const description = input.description.trim();
  if (description.length > DESCRIPTION_MAX) errors.description = "descriptionTooLong";

  // La locandina deve essere un indirizzo vero. Accettiamo anche quelli esterni:
  // i primi eventi inseriti da OpenStage hanno locandine che vivono altrove, e
  // devono restare modificabili.
  const coverImageUrl = input.coverImageUrl.trim();
  if (coverImageUrl.length > COVER_URL_MAX || (coverImageUrl !== "" && !isHttpUrl(coverImageUrl))) {
    errors.coverImageUrl = "coverInvalid";
  }

  if (!startsAt || Object.keys(errors).length > 0) {
    if (!startsAt && !errors.date && !errors.time && !errors.timezone) errors.date = "dateInvalid";
    return { ok: false, errors };
  }

  const locationPrecision: LocationPrecision =
    input.locationPrecision === "approximate" ? "approximate" : "exact";

  const requestedRadius = Math.round(Number(input.areaRadiusM));
  const areaRadiusM =
    locationPrecision === "approximate"
      ? Math.min(20000, Math.max(200, Number.isFinite(requestedRadius) && requestedRadius > 0 ? requestedRadius : DEFAULT_RADIUS_M))
      : null;

  return {
    ok: true,
    values: {
      title,
      kind: input.kind,
      genre: genre || null,
      description: description || null,
      startsAt,
      timezone,
      venueId: hasVenue ? venueId : null,
      // Il nome del locale scritto a mano serve solo se non c'è una scheda
      // collegata: altrimenti conterebbe due volte la stessa cosa.
      venueName: hasVenue ? null : venueName || null,
      city: city || null,
      latitude: hasPoint ? latitude : null,
      longitude: hasPoint ? longitude : null,
      locationPrecision,
      areaRadiusM,
      isFree: input.isFree,
      priceText: input.isFree || priceText === "" ? null : priceText,
      ticketUrl: ticketUrl || null,
      coverImageUrl: coverImageUrl || null,
    },
  };
}

/**
 * L'istante descritto dal modulo, se data e ora sono leggibili. Serve
 * all'anteprima, che deve mostrare la data mentre la si scrive.
 */
export function editorInstant(state: EventEditorState): string | null {
  const date = parseDate(state.date);
  const time = parseTime(state.time);
  if (!date || !time) return null;

  const instant = zonedInstant({ ...date, ...time }, state.timezone.trim() || FILTER_TIMEZONE);

  return Number.isFinite(instant.getTime()) ? instant.toISOString() : null;
}

/** Modulo vuoto: una serata fra una settimana alle 21:30, orario dei concerti. */
export function initialEditorState(timezone = FILTER_TIMEZONE): EventEditorState {
  const inAWeek = addDays(calendarDate(new Date(), timezone), 7);
  const date = [
    String(inAWeek.year).padStart(4, "0"),
    String(inAWeek.month).padStart(2, "0"),
    String(inAWeek.day).padStart(2, "0"),
  ].join("-");

  return {
    title: "",
    kind: "concert",
    genre: "",
    description: "",
    date,
    time: "21:30",
    timezone,
    venueId: "",
    venueName: "",
    city: "",
    latitude: null,
    longitude: null,
    locationPrecision: "exact",
    areaRadiusM: DEFAULT_RADIUS_M,
    isFree: false,
    priceText: "",
    ticketUrl: "",
    coverImageUrl: "",
  };
}

/** L'evento salvato, nella forma che il modulo sa modificare. */
export type EditableEvent = {
  title: string;
  kind: EventKind;
  genre: string | null;
  description: string | null;
  startsAt: string;
  timezone: string;
  venueId: string | null;
  venueName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: LocationPrecision;
  areaRadiusM: number | null;
  isFree: boolean;
  priceText: string | null;
  ticketUrl: string | null;
  coverImageUrl: string | null;
};

export function editorStateFromEvent(event: EditableEvent): EventEditorState {
  const { date, time } = zonedDateTime(new Date(event.startsAt), event.timezone);

  return {
    title: event.title,
    kind: event.kind,
    genre: event.genre ?? "",
    description: event.description ?? "",
    date,
    time,
    timezone: event.timezone,
    venueId: event.venueId ?? "",
    venueName: event.venueName ?? "",
    city: event.city ?? "",
    latitude: event.latitude,
    longitude: event.longitude,
    locationPrecision: event.locationPrecision,
    areaRadiusM: event.areaRadiusM ?? DEFAULT_RADIUS_M,
    isFree: event.isFree,
    priceText: event.priceText ?? "",
    ticketUrl: event.ticketUrl ?? "",
    coverImageUrl: event.coverImageUrl ?? "",
  };
}
