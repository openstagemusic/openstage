"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { saveEventAction, type SaveEventResult } from "@/app/actions/events";
import CoverField, { type PosterSource } from "@/components/dashboard/CoverField";
import EventPreviewCard from "@/components/dashboard/EventPreviewCard";
import type { MapFocus } from "@/components/dashboard/LocationPicker";
import LocaleLink from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { renderFlyer } from "@/lib/covers/flyer";
import type { VenueOption } from "@/lib/dashboard/queries";
import {
  editorInstant,
  RADIUS_OPTIONS_M,
  TIMEZONE_OPTIONS,
  type EditorErrorCode,
  type EditorField,
  type EventEditorState,
} from "@/lib/events/editor";
import { formatEventDate } from "@/lib/events/format";
import { EVENT_KINDS } from "@/lib/events/types";
import type { GeocodePlace } from "@/lib/geo/geocoder";

// MapLibre ha bisogno del browser: la mini mappa entra solo nel client.
const LocationPicker = dynamic(() => import("@/components/dashboard/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded-2xl border border-white/10 bg-white/5" />
  ),
});

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-violet/60";
const labelClass = "mb-1 block text-sm text-muted";
const primaryButton =
  "rounded-full bg-gradient-to-r from-violet to-cyan px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const secondaryButton =
  "rounded-full border border-white/15 px-5 py-2.5 text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-50";

type EventEditorProps = {
  mode: "create" | "edit";
  /** L'evento in modifica (`null` quando si crea). */
  eventId: string | null;
  initial: EventEditorState;
  /** Nome del locale collegato, quando l'evento ne ha già uno. */
  linkedVenueName: string | null;
  cities: string[];
  genres: string[];
  /** Dove aprire la mini mappa se non c'è ancora un pin. */
  mapCenter: { latitude: number; longitude: number };
  verified: boolean;
  currentStatus: "draft" | "published" | "cancelled";
  dict: Dictionary;
};

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-pink">{error}</p> : null}
    </div>
  );
}

/**
 * Il modulo di creazione e modifica di un evento.
 *
 * Scrive passando da un'azione del server, non direttamente dal browser, per due
 * motivi: le regole di validità devono valere anche se qualcuno parla con il
 * database per conto suo, e `created_by`/`artist_id` non sono campi che si
 * scelgono dal modulo — li decide il server.
 */
export default function EventEditor({
  mode,
  eventId,
  initial,
  linkedVenueName,
  cities,
  genres,
  mapCenter,
  verified,
  currentStatus,
  dict,
}: EventEditorProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = dict.editor;

  const [values, setValues] = useState<EventEditorState>(initial);
  const [linkedVenue, setLinkedVenue] = useState<{ id: string; name: string } | null>(
    initial.venueId && linkedVenueName ? { id: initial.venueId, name: linkedVenueName } : null
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VenueOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<EditorField, EditorErrorCode>>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<"draft" | "published" | "cancelled" | null>(null);
  // Ricerca dei posti (città, indirizzi, locali): scegliendone uno la mappa vola lì.
  const [placeQuery, setPlaceQuery] = useState("");
  const [places, setPlaces] = useState<GeocodePlace[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [placesFailed, setPlacesFailed] = useState(false);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const focusCounter = useRef(0);

  // Città e pin si scambiano informazioni (chi cerca un posto muove il pin, chi
  // trascina il pin riempie la città): letti una volta sola, con un nome chiaro.
  const { city, latitude, longitude } = values;

  function set<K extends keyof EventEditorState>(field: K, value: EventEditorState[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors({});
    setMessage(null);
  }

  // Ricerca fra i locali già su OpenStage, con un piccolo ritardo sulla battitura.
  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(`/api/venues?q=${encodeURIComponent(term)}`);
        const payload = (await response.json()) as { venues?: VenueOption[] };
        if (!cancelled) setResults(payload.venues ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // La mappa vola su un posto scelto fuori dalla mappa (locale collegato o città
  // cercata): il pin deve vedersi, non essere cercato a mano.
  function flyTo(point: { latitude: number; longitude: number; zoom: number }) {
    focusCounter.current += 1;
    setFocus({ ...point, token: focusCounter.current });
  }

  function linkVenue(venue: VenueOption) {
    setLinkedVenue({ id: venue.id, name: venue.name });
    setValues((current) => ({
      ...current,
      venueId: venue.id,
      venueName: "",
      city: venue.city ?? current.city,
      latitude: venue.latitude ?? current.latitude,
      longitude: venue.longitude ?? current.longitude,
    }));
    setQuery("");
    setResults([]);
    setErrors({});
    setMessage(null);

    // Un locale su OpenStage porta con sé le sue coordinate: la mappa ci va.
    if (venue.latitude !== null && venue.longitude !== null) {
      flyTo({ latitude: venue.latitude, longitude: venue.longitude, zoom: 15 });
    }
  }

  /**
   * Un posto scelto fra i suggerimenti.
   *
   * La città si prende dal risultato (per un indirizzo è il comune, non la via):
   * è quella che finisce nell'anteprima, nei filtri e nell'indirizzo della
   * scheda. Il pin si posa lì, e da lì si trascina per precisare.
   */
  function choosePlace(place: GeocodePlace) {
    setValues((current) => ({
      ...current,
      city: place.city ?? current.city,
      latitude: place.latitude,
      longitude: place.longitude,
    }));
    setPlaceQuery("");
    setPlaces([]);
    setPlacesFailed(false);
    setErrors({});
    setMessage(null);
    flyTo({ latitude: place.latitude, longitude: place.longitude, zoom: place.zoom });
  }

  /** Una città che usiamo già: la scriviamo come la scrive OpenStage. */
  function chooseKnownCity(city: string) {
    set("city", city);
    setPlaceQuery("");
    setPlaces([]);
    setPlacesFailed(false);
  }

  // Ricerca dei posti, con lo stesso piccolo ritardo della ricerca dei locali.
  useEffect(() => {
    const term = placeQuery.trim();

    if (term.length < 3) {
      setPlaces([]);
      setPlacesFailed(false);
      setSearchingPlaces(false);
      return;
    }

    // Da qui la ricerca è in corso anche durante il ritardo sulla battitura:
    // così il ripiego con le città già su OpenStage non compare e sparisce.
    setSearchingPlaces(true);

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(term)}&lang=${locale}`);
        const payload = (await response.json()) as { places?: GeocodePlace[] };
        if (cancelled) return;
        setPlaces(payload.places ?? []);
        setPlacesFailed(!response.ok);
      } catch {
        if (cancelled) return;
        setPlaces([]);
        setPlacesFailed(true);
      } finally {
        if (!cancelled) setSearchingPlaces(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placeQuery, locale]);

  // Il pin si trascina dove si tiene la serata: se la città è ancora vuota, la
  // chiediamo al geocodificatore inverso invece di lasciare il campo da riempire.
  useEffect(() => {
    if (city.trim() !== "") return;
    if (latitude === null || longitude === null) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}&lang=${locale}`);
        const payload = (await response.json()) as { places?: GeocodePlace[] };
        const found = payload.places?.[0]?.city ?? null;

        if (cancelled || !found) return;

        setValues((current) => (current.city.trim() === "" ? { ...current, city: found } : current));
      } catch {
        // La città resta vuota: si può sempre scrivere a mano.
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city, latitude, longitude, locale]);

  function unlinkVenue() {
    setLinkedVenue(null);
    setValues((current) => ({ ...current, venueId: "" }));
    setMessage(null);
  }

  /**
   * Disegna la locandina da condividere, dai dati già scritti.
   *
   * La sorgente della foto la decide `CoverField`: il file scelto adesso, oppure
   * l'immagine già salvata riletta dall'indirizzo. Quello che esce non si carica
   * e non tocca la scheda: si scarica soltanto.
   *
   * Senza titolo non si disegna: la locandina deve dire almeno di cosa si tratta.
   */
  async function buildFlyer(source: PosterSource): Promise<Blob | null> {
    const instant = editorInstant(values);
    const when = instant ? formatEventDate(instant, values.timezone, locale).full : null;

    return renderFlyer({
      kind: dict.events.kinds[values.kind] ?? dict.events.kinds.other,
      title: values.title,
      venue: linkedVenue?.name ?? (values.venueName.trim() || null),
      city: values.city.trim() || null,
      when,
      price: values.isFree ? null : values.priceText.trim() || null,
      freeLabel: dict.events.freeEntry,
      photo: source,
    });
  }

  /**
   * Gli errori del salvataggio, tradotti.
   *
   * L'azione risponde con un **codice** (`rateLimited`, `suspended`, …): qui
   * diventa una frase. Il database parla per codici SQLSTATE, la traduzione sta
   * in un posto solo.
   */
  const saveErrorText: Record<NonNullable<SaveEventResult["error"]>, string> = {
    unauthorized: t.saveFailed,
    notFound: t.notFound,
    rateLimited: t.tooManyEvents,
    suspended: t.suspendedAccount,
    saveFailed: t.saveFailed,
  };

  async function submit(status: "draft" | "published" | "cancelled") {
    setBusy(status);
    setErrors({});
    setMessage(null);

    const outcome = await saveEventAction({
      eventId: mode === "edit" ? eventId : null,
      status,
      values,
    });

    setBusy(null);

    if (!outcome.ok) {
      if (outcome.fieldErrors) {
        setErrors(outcome.fieldErrors);
        setMessage({ tone: "error", text: t.errorsSummary });
        return;
      }

      setMessage({
        tone: "error",
        text: outcome.error ? saveErrorText[outcome.error] : t.saveFailed,
      });
      return;
    }

    if (mode === "create") {
      router.push("/dashboard/events");
      router.refresh();
      return;
    }

    setMessage({
      tone: "ok",
      text:
        status === "published" && outcome.status === "published"
          ? t.publishedNow
          : status === "published"
            ? t.stayedDraft
            : t.saved,
    });

    router.refresh();
  }

  const radiusLabels: Record<number, string> = {
    500: t.radius500,
    1500: t.radius1500,
    3000: t.radius3000,
  };

  const errorCount = Object.keys(errors).length;

  // Sotto la città: prima i posti trovati dal geocodificatore e, solo se non ne
  // ha trovato nessuno, le città che OpenStage usa già. Un servizio lento o
  // irraggiungibile non deve lasciare il campo senza nessun aiuto.
  const placeTerm = placeQuery.trim().toLowerCase();
  const knownCities =
    placeTerm.length >= 2 && !searchingPlaces && places.length === 0
      ? cities.filter((city) => city.toLowerCase().includes(placeTerm)).slice(0, 3)
      : [];
  const showCitySuggestions = places.length > 0 || knownCities.length > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form
        className="min-w-0"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(mode === "create" ? "draft" : currentStatus);
        }}
      >
        {message ? (
          <p
            className={
              message.tone === "ok"
                ? "mb-6 rounded-2xl border border-cyan/40 bg-cyan/10 p-4 text-sm text-white"
                : "mb-6 rounded-2xl border border-pink/40 bg-pink/10 p-4 text-sm text-white"
            }
            role="status"
          >
            {message.text}
          </p>
        ) : null}

        {errorCount > 0 ? (
          <p className="mb-6 rounded-2xl border border-pink/40 bg-pink/10 p-4 text-sm text-white" role="alert">
            {t.errorsSummary}
          </p>
        ) : null}

        {!verified ? (
          <p className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
            {t.unverifiedNote}
          </p>
        ) : null}

        {/* --- La serata ------------------------------------------------- */}
        <h2 className="font-display text-lg font-semibold">{t.sectionWhat}</h2>

        <div className="mt-3 grid gap-4">
          <Field id="event-title" label={t.title} error={errors.title ? t.errors[errors.title] : null}>
            <input
              id="event-title"
              className={inputClass}
              value={values.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder={t.titlePlaceholder}
              maxLength={200}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="event-kind" label={t.kind} error={errors.kind ? t.errors[errors.kind] : null}>
              <select
                id="event-kind"
                className={inputClass}
                value={values.kind}
                onChange={(event) => set("kind", event.target.value as EventEditorState["kind"])}
              >
                {EVENT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {dict.events.kinds[kind]}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="event-genre" label={t.genre} error={errors.genre ? t.errors[errors.genre] : null}>
              <input
                id="event-genre"
                className={inputClass}
                value={values.genre}
                onChange={(event) => set("genre", event.target.value)}
                placeholder={t.genrePlaceholder}
                list="event-genres"
                maxLength={60}
              />
              <datalist id="event-genres">
                {genres.map((genre) => (
                  <option key={genre} value={genre} />
                ))}
              </datalist>
            </Field>
          </div>
        </div>

        {/* --- Quando ---------------------------------------------------- */}
        <h2 className="mt-8 font-display text-lg font-semibold">{t.sectionWhen}</h2>

        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Field id="event-date" label={t.date} error={errors.date ? t.errors[errors.date] : null}>
            <input
              id="event-date"
              type="date"
              className={inputClass}
              value={values.date}
              onChange={(event) => set("date", event.target.value)}
            />
          </Field>

          <Field id="event-time" label={t.time} error={errors.time ? t.errors[errors.time] : null}>
            <input
              id="event-time"
              type="time"
              className={inputClass}
              value={values.time}
              onChange={(event) => set("time", event.target.value)}
            />
          </Field>

          <Field
            id="event-timezone"
            label={t.timezone}
            error={errors.timezone ? t.errors[errors.timezone] : null}
          >
            <select
              id="event-timezone"
              className={inputClass}
              value={values.timezone}
              onChange={(event) => set("timezone", event.target.value)}
            >
              {TIMEZONE_OPTIONS.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* --- Dove ------------------------------------------------------ */}
        <h2 className="mt-8 font-display text-lg font-semibold">{t.sectionWhere}</h2>

        {linkedVenue ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-3">
            <span className="text-sm text-white">
              <span className="text-muted">{t.venueLinked}: </span>
              {linkedVenue.name}
            </span>
            <button
              type="button"
              onClick={unlinkVenue}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-muted transition-colors hover:text-white"
            >
              {t.venueUnlink}
            </button>
          </div>
        ) : (
          <div className="relative mt-3">
            <Field
              id="event-venue-search"
              label={t.venueSearch}
              error={errors.venueId ? t.errors[errors.venueId] : null}
            >
              <input
                id="event-venue-search"
                className={inputClass}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.venueSearchPlaceholder}
                autoComplete="off"
              />
            </Field>

            {results.length > 0 ? (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0d0d1a] shadow-xl">
                {results.map((venue) => (
                  <li key={venue.id}>
                    <button
                      type="button"
                      onClick={() => linkVenue(venue)}
                      className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
                    >
                      <span className="text-white">{venue.name}</span>
                      <span className="block text-xs text-muted">
                        {[venue.city, venue.address].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {query.trim().length >= 2 && !searching && results.length === 0 ? (
              <p className="mt-1 text-xs text-muted">{t.venueSearchEmpty}</p>
            ) : null}
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {!linkedVenue ? (
            <Field
              id="event-venue-name"
              label={t.venueName}
              hint={t.venueNameHint}
              error={errors.venueName ? t.errors[errors.venueName] : null}
            >
              <input
                id="event-venue-name"
                className={inputClass}
                value={values.venueName}
                onChange={(event) => set("venueName", event.target.value)}
                placeholder={t.venueNamePlaceholder}
                maxLength={120}
              />
            </Field>
          ) : null}

          <Field
            id="event-city"
            label={t.city}
            hint={t.cityHint}
            error={errors.city ? t.errors[errors.city] : null}
          >
            <div className="relative">
              <input
                id="event-city"
                className={inputClass}
                value={values.city}
                onChange={(event) => {
                  set("city", event.target.value);
                  setPlaceQuery(event.target.value);
                }}
                // Il tempo di un clic su un suggerimento, poi la tendina si chiude.
                onBlur={() => window.setTimeout(() => setPlaceQuery(""), 150)}
                placeholder={t.cityPlaceholder}
                autoComplete="off"
                maxLength={80}
              />

              {showCitySuggestions ? (
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0d0d1a] shadow-xl">
                  {places.map((place) => (
                    <li key={place.id}>
                      <button
                        type="button"
                        onClick={() => choosePlace(place)}
                        className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
                      >
                        <span className="text-white">{place.name}</span>
                        <span className="block text-xs text-muted">{place.detail}</span>
                      </button>
                    </li>
                  ))}

                  {knownCities.map((city) => (
                    <li key={`city-${city}`}>
                      <button
                        type="button"
                        onClick={() => chooseKnownCity(city)}
                        className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
                      >
                        <span className="text-white">{city}</span>
                        <span className="block text-xs text-muted">{t.cityKnown}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {placeQuery.trim().length >= 3 && !searchingPlaces && !showCitySuggestions ? (
                <p className="mt-1 text-xs text-muted">
                  {placesFailed ? t.placeSearchError : t.placeSearchEmpty}
                </p>
              ) : null}
            </div>
          </Field>
        </div>

        <div className="mt-4">
          <p className={labelClass}>{t.mapTitle}</p>
          <LocationPicker
            latitude={values.latitude}
            longitude={values.longitude}
            center={mapCenter}
            focus={focus}
            ariaLabel={t.mapTitle}
            onChange={(point) => {
              setValues((current) => ({
                ...current,
                latitude: point.latitude,
                longitude: point.longitude,
              }));
              setErrors({});
              setMessage(null);
            }}
          />
          <p className="mt-1 text-xs text-muted">
            {values.latitude === null ? t.mapNoPin : t.mapHint}
          </p>
          {errors.location ? <p className="mt-1 text-xs text-pink">{t.errors[errors.location]}</p> : null}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field id="event-precision" label={t.precision}>
            <select
              id="event-precision"
              className={inputClass}
              value={values.locationPrecision}
              onChange={(event) =>
                set("locationPrecision", event.target.value as EventEditorState["locationPrecision"])
              }
            >
              <option value="exact">{t.precisionExact}</option>
              <option value="approximate">{t.precisionApproximate}</option>
            </select>
          </Field>

          {values.locationPrecision === "approximate" ? (
            <Field id="event-radius" label={t.radius}>
              <select
                id="event-radius"
                className={inputClass}
                value={values.areaRadiusM}
                onChange={(event) => set("areaRadiusM", Number(event.target.value))}
              >
                {RADIUS_OPTIONS_M.map((radius) => (
                  <option key={radius} value={radius}>
                    {radiusLabels[radius] ?? `${radius} m`}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>

        {/* --- Ingresso -------------------------------------------------- */}
        <h2 className="mt-8 font-display text-lg font-semibold">{t.sectionMoney}</h2>

        <div className="mt-3 grid gap-4">
          <label className="flex items-center gap-3 text-sm text-white">
            <input
              type="checkbox"
              checked={values.isFree}
              onChange={(event) => set("isFree", event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/10"
            />
            {t.free}
          </label>

          {!values.isFree ? (
            <Field id="event-price" label={t.price} error={errors.priceText ? t.errors[errors.priceText] : null}>
              <input
                id="event-price"
                className={inputClass}
                value={values.priceText}
                onChange={(event) => set("priceText", event.target.value)}
                placeholder={t.pricePlaceholder}
                maxLength={40}
              />
            </Field>
          ) : null}

          <Field
            id="event-ticket"
            label={t.ticketUrl}
            error={errors.ticketUrl ? t.errors[errors.ticketUrl] : null}
          >
            <input
              id="event-ticket"
              className={inputClass}
              value={values.ticketUrl}
              onChange={(event) => set("ticketUrl", event.target.value)}
              placeholder={t.ticketUrlPlaceholder}
              maxLength={300}
              inputMode="url"
            />
          </Field>
        </div>

        {/* --- Immagine e locandina ---------------------------------------- */}
        <h2 className="mt-8 font-display text-lg font-semibold">{t.sectionCover}</h2>

        <div className="mt-3">
          <CoverField
            value={values.coverImageUrl}
            onChange={(url) => set("coverImageUrl", url)}
            title={values.title}
            buildFlyer={buildFlyer}
            labels={{
              empty: t.coverEmpty,
              choose: t.coverChoose,
              replace: t.coverReplace,
              remove: t.coverRemove,
              uploading: t.coverUploading,
              hint: t.coverHint,
              errors: t.coverErrors,
              posterTitle: t.posterTitle,
              posterHint: t.posterHint,
              posterGenerate: t.posterGenerate,
              posterGenerating: t.posterGenerating,
              posterAgain: t.posterAgain,
              posterDownload: t.posterDownload,
              posterNeedsTitle: t.posterNeedsTitle,
            }}
          />
          {errors.coverImageUrl ? (
            <p className="mt-1 text-xs text-pink">{t.errors[errors.coverImageUrl]}</p>
          ) : null}
        </div>

        {/* --- Descrizione ----------------------------------------------- */}
        <h2 className="mt-8 font-display text-lg font-semibold">{t.sectionMore}</h2>

        <div className="mt-3">
          <Field
            id="event-description"
            label={t.description}
            error={errors.description ? t.errors[errors.description] : null}
          >
            <textarea
              id="event-description"
              className={`${inputClass} min-h-32`}
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder={t.descriptionPlaceholder}
              maxLength={2200}
            />
          </Field>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy !== null} className={secondaryButton}>
            {busy === "draft" || busy === "cancelled"
              ? t.saving
              : mode === "create"
                ? t.saveDraft
                : t.save}
          </button>

          {verified && currentStatus !== "published" ? (
            <button
              type="button"
              onClick={() => void submit("published")}
              disabled={busy !== null}
              className={primaryButton}
            >
              {busy === "published" ? t.saving : t.publish}
            </button>
          ) : null}

          <LocaleLink
            href="/dashboard/events"
            className="text-sm text-muted transition-colors hover:text-white"
          >
            {t.backToList}
          </LocaleLink>
        </div>
      </form>

      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted">{t.previewTitle}</p>
        <EventPreviewCard values={values} locale={locale} dict={dict} />
        <p className="mt-2 text-xs text-muted">{t.previewHint}</p>
      </aside>
    </div>
  );
}
