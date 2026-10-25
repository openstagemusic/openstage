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
import type { ArtistOption, VenueOption } from "@/lib/dashboard/queries";
import {
  DIRECTIONS_MAX,
  editorInstant,
  RADIUS_OPTIONS_M,
  TIMEZONE_OPTIONS,
  type EditorErrorCode,
  type EditorField,
  type EventEditorState,
} from "@/lib/events/editor";
import { formatEventDate } from "@/lib/events/format";
import type { SimilarEvent } from "@/lib/events/queries";
import { EVENT_KINDS } from "@/lib/events/types";
import type { GeocodePlace } from "@/lib/geo/geocoder";

// MapLibre ha bisogno del browser: la mini mappa entra solo nel client.
const LocationPicker = dynamic(() => import("@/components/dashboard/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse border border-line bg-surface" />
  ),
});

const inputClass =
  "w-full border border-line bg-surface px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-cyan";
const labelClass =
  "mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted";
const primaryButton =
  "inline-flex min-h-11 items-center justify-center border border-violet-strong bg-violet-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center border border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-line-strong disabled:opacity-50";

type EventEditorProps = {
  mode: "create" | "edit";
  /** L'evento in modifica (`null` quando si crea). */
  eventId: string | null;
  initial: EventEditorState;
  /** Nome del locale collegato, quando l'evento ne ha già uno. */
  linkedVenueName: string | null;
  /** L'artista collegato: la scheda scelta, o quella di chi sta scrivendo. */
  linkedArtist: { id: string; name: string } | null;
  /** Un artista non sceglie: la serata è la sua. */
  artistLocked: boolean;
  cities: string[];
  genres: string[];
  /** Dove aprire la mini mappa se non c'è ancora un pin. */
  mapCenter: { latitude: number; longitude: number };
  verified: boolean;
  currentStatus: "draft" | "published" | "cancelled";
  /** Quando l'evento è stato letto (`null` quando si crea): serve a non sovrascrivere. */
  updatedAt: string | null;
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

function SectionHeading({ step, title }: { step: string; title: string }) {
  return (
    <div className="mt-10 flex items-baseline gap-3 border-t border-line pt-6">
      <span className="font-mono text-[10px] tracking-[0.14em] text-cyan">{step}</span>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
    </div>
  );
}

/**
 * Una chiave nuova per questa compilazione.
 *
 * Non è un segreto: serve solo a riconoscere «lo stesso invio». `randomUUID` c'è
 * nei browser moderni; dove manca, due numeri casuali bastano allo scopo.
 */
function createClientKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
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
  linkedArtist,
  artistLocked,
  cities,
  genres,
  mapCenter,
  verified,
  currentStatus,
  updatedAt: initialUpdatedAt,
  dict,
}: EventEditorProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = dict.editor;

  const [values, setValues] = useState<EventEditorState>(initial);
  /**
   * Quando il server ha salvato l'evento l'ultima volta.
   *
   * Si aggiorna a ogni salvataggio riuscito: il secondo salvataggio della stessa
   * sessione deve riconoscere la propria scrittura, non crederla di un altro.
   */
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  /**
   * La chiave di questa compilazione.
   *
   * Nasce al primo invio e resta la stessa finché il modulo è aperto: se la
   * rete ripete l'invio (o il dito scivola due volte) il database riconosce la
   * serata già creata e non ne fa una seconda.
   */
  const clientKey = useRef<string | null>(null);
  const [linkedVenue, setLinkedVenue] = useState<{ id: string; name: string } | null>(
    initial.venueId && linkedVenueName ? { id: initial.venueId, name: linkedVenueName } : null
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VenueOption[]>([]);
  const [searching, setSearching] = useState(false);
  // Artista collegato: lo sceglie il locale, l'artista ce l'ha già per forza.
  const [artist, setArtist] = useState<{ id: string; name: string } | null>(
    initial.artistId && linkedArtist ? linkedArtist : artistLocked ? linkedArtist : null
  );
  const [artistQuery, setArtistQuery] = useState("");
  const [artistResults, setArtistResults] = useState<ArtistOption[]>([]);
  const [searchingArtists, setSearchingArtists] = useState(false);
  // Serate che assomigliano a questa: si avvisa, non si blocca.
  const [duplicates, setDuplicates] = useState<SimilarEvent[]>([]);
  const pendingStatus = useRef<"draft" | "published" | "cancelled">("draft");
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
  /**
   * Città e pin raccontano lo stesso posto? Il controllo è **un avviso**: chi
   * salva decide il server (che rifà il controllo), qui serve a non scoprirlo
   * solo alla fine.
   */
  const [locationWarning, setLocationWarning] = useState<
    "far" | "empty" | "impossible" | null
  >(null);
  /** Istantanea dell'ultima versione salvata: serve solo all'avviso di uscita. */
  const savedSnapshot = useRef(JSON.stringify(initial));

  useEffect(() => {
    if (JSON.stringify(values) === savedSnapshot.current) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [values]);

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

  // Ricerca fra gli artisti già su OpenStage: serve al locale che organizza la
  // serata di qualcun altro. A un artista non si chiede nulla.
  useEffect(() => {
    if (artistLocked) return;

    const term = artistQuery.trim();

    if (term.length < 2) {
      setArtistResults([]);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setSearchingArtists(true);

      try {
        const response = await fetch(`/api/artists?q=${encodeURIComponent(term)}`);
        const payload = (await response.json()) as { artists?: ArtistOption[] };
        if (!cancelled) setArtistResults(payload.artists ?? []);
      } catch {
        if (!cancelled) setArtistResults([]);
      } finally {
        if (!cancelled) setSearchingArtists(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [artistQuery, artistLocked]);

  function linkArtist(option: ArtistOption) {
    setArtist({ id: option.id, name: option.name });
    setValues((current) => ({ ...current, artistId: option.id }));
    setArtistQuery("");
    setArtistResults([]);
    setErrors({});
    setMessage(null);
  }

  function unlinkArtist() {
    setArtist(null);
    setValues((current) => ({ ...current, artistId: "" }));
    setMessage(null);
  }

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

  // La città scritta e il pin devono raccontare lo stesso posto. Il controllo
  // parte da solo mentre si compila, con un ritardo: il salvataggio lo rifà
  // comunque, ed è quello che conta.
  useEffect(() => {
    if (city.trim() === "" || latitude === null || longitude === null) {
      setLocationWarning(null);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/geocode?lat=${latitude}&lon=${longitude}&city=${encodeURIComponent(
            city.trim()
          )}&lang=${locale}`
        );
        const payload = (await response.json()) as {
          locationCheck?: { status?: string };
        };

        if (cancelled) return;

        const status = payload.locationCheck?.status;
        setLocationWarning(
          status === "far" || status === "empty" || status === "impossible" ? status : null
        );
      } catch {
        // Il controllo è un aiuto, non una condizione: se non risponde, si tace.
        if (!cancelled) setLocationWarning(null);
      }
    }, 800);

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
    conflict: t.conflict,
    rateLimited: t.tooManyEvents,
    suspended: t.suspendedAccount,
    noPage: t.noPageCreate,
    saveFailed: t.saveFailed,
  };

  async function submit(status: "draft" | "published" | "cancelled", confirmDuplicate = false) {
    setBusy(status);
    setErrors({});
    setMessage(null);
    setDuplicates([]);
    pendingStatus.current = status;

    if (!clientKey.current) clientKey.current = createClientKey();

    const outcome = await saveEventAction({
      eventId: mode === "edit" ? eventId : null,
      status,
      values,
      clientKey: clientKey.current,
      // In creazione non c'è niente da proteggere: la riga non esiste ancora.
      expectedUpdatedAt: mode === "edit" ? updatedAt : null,
      confirmDuplicate,
    });

    setBusy(null);

    if (!outcome.ok) {
      // «Esiste già una serata simile»: non è un errore, è una domanda.
      if (outcome.duplicates) {
        setDuplicates(outcome.duplicates);
        return;
      }

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

    // La riga è cambiata: il prossimo salvataggio parte da questa versione.
    if (outcome.updatedAt) setUpdatedAt(outcome.updatedAt);
    savedSnapshot.current = JSON.stringify(values);

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

  /** «Lo so, creala lo stesso»: si rimanda lo stesso salvataggio, confermando. */
  function createAnyway() {
    void submit(pendingStatus.current, true);
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
                ? "mb-6 border-l-2 border-cyan bg-cyan/10 px-4 py-3 text-sm text-white"
                : "mb-6 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white"
            }
            role="status"
          >
            {message.text}
          </p>
        ) : null}

        {errorCount > 0 ? (
          <p className="mb-6 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white" role="alert">
            {t.errorsSummary}
          </p>
        ) : null}

        {!verified ? (
          <p className="mb-6 border-l-2 border-line-strong bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-muted">
            {t.unverifiedNote}
          </p>
        ) : null}

        {/* Su mobile le azioni restano vicine all'inizio del modulo. */}
        <div className="mb-6 flex flex-col gap-2 border-y border-line py-3 sm:flex-row lg:hidden">
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
        </div>

        {/* --- La serata ------------------------------------------------- */}
        <SectionHeading step="01" title={t.sectionWhat} />

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
        <SectionHeading step="02" title={t.sectionWhen} />

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
        <SectionHeading step="03" title={t.sectionWhere} />

        {linkedVenue ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-cyan/40 bg-cyan/5 px-4 py-3">
            <span className="text-sm text-white">
              <span className="text-muted">{t.venueLinked}: </span>
              {linkedVenue.name}
            </span>
            <button
              type="button"
              onClick={unlinkVenue}
              className="inline-flex min-h-11 items-center border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
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
              <ul className="absolute z-20 mt-1 w-full overflow-hidden border border-line bg-surface shadow-xl">
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

        {/* --- Chi suona ------------------------------------------------- */}
        {artistLocked ? (
          <div className="mt-4 border border-line bg-white/[0.03] px-4 py-3">
            <span className="text-sm text-white">
              <span className="text-muted">{t.artistLinked}: </span>
              {artist?.name ?? t.artistYou}
            </span>
            <p className="mt-1 text-xs text-muted">{t.artistLockedHint}</p>
          </div>
        ) : artist ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-violet/40 bg-violet/5 px-4 py-3">
            <span className="text-sm text-white">
              <span className="text-muted">{t.artistLinked}: </span>
              {artist.name}
            </span>
            <button
              type="button"
              onClick={unlinkArtist}
              className="inline-flex min-h-11 items-center border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
            >
              {t.artistUnlink}
            </button>
          </div>
        ) : (
          <div className="relative mt-4">
            <Field
              id="event-artist-search"
              label={t.artistSearch}
              hint={t.artistHint}
              error={errors.artistId ? t.errors[errors.artistId] : null}
            >
              <input
                id="event-artist-search"
                className={inputClass}
                value={artistQuery}
                onChange={(event) => setArtistQuery(event.target.value)}
                placeholder={t.artistSearchPlaceholder}
                autoComplete="off"
              />
            </Field>

            {artistResults.length > 0 ? (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden border border-line bg-surface shadow-xl">
                {artistResults.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => linkArtist(option)}
                      className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
                    >
                      <span className="text-white">{option.name}</span>
                      {option.city ? (
                        <span className="block text-xs text-muted">{option.city}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {artistQuery.trim().length >= 2 && !searchingArtists && artistResults.length === 0 ? (
              <p className="mt-1 text-xs text-muted">{t.artistSearchEmpty}</p>
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
                <ul className="absolute z-20 mt-1 w-full overflow-hidden border border-line bg-surface shadow-xl">
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
          {!errors.location && locationWarning ? (
            <p
              className={`mt-1 text-xs ${
                locationWarning === "far" ? "text-cyan" : "text-pink"
              }`}
            >
              {locationWarning === "far"
                ? t.locationFarHint
                : t.errors[
                    locationWarning === "empty" ? "locationEmpty" : "locationTooFar"
                  ]}
            </p>
          ) : null}
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

        {/* Per i posti che un indirizzo non ce l'hanno: centri sociali, loft,
            cortili, spiagge. Due righe, che la pagina evento mostra accanto
            al dove. */}
        <div className="mt-4">
          <Field
            id="event-directions"
            label={t.directions}
            hint={t.directionsHint}
            error={errors.directions ? t.errors[errors.directions] : null}
          >
            <textarea
              id="event-directions"
              className={inputClass}
              rows={2}
              value={values.directions}
              onChange={(event) => set("directions", event.target.value)}
              placeholder={t.directionsPlaceholder}
              maxLength={DIRECTIONS_MAX}
            />
          </Field>
        </div>

        {/* --- Ingresso -------------------------------------------------- */}
        <SectionHeading step="04" title={t.sectionMoney} />
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
        <SectionHeading step="05" title={t.sectionCover} />

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
        <SectionHeading step="06" title={t.sectionMore} />

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

        {duplicates.length > 0 ? (
          <div className="mt-8 border border-cyan/40 bg-cyan/5 p-4">
            <p className="font-display text-sm font-semibold text-white">{t.duplicatesTitle}</p>
            <p className="mt-1 text-xs text-muted">{t.duplicatesHint}</p>

            <ul className="mt-3 space-y-2">
              {duplicates.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-line bg-surface px-3 py-2"
                >
                  <span className="text-sm text-white">
                    {item.title}
                    <span className="block text-xs text-muted">
                      {[item.city, formatEventDate(item.startsAt, values.timezone, locale).full]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <a
                    href={`/${locale}${item.path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan underline underline-offset-2"
                  >
                    {t.duplicateSee}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={createAnyway}
                disabled={busy !== null}
                className={primaryButton}
              >
                {busy ? t.saving : t.duplicateCreateAnyway}
              </button>
              <button
                type="button"
                onClick={() => setDuplicates([])}
                className="text-xs text-muted transition-colors hover:text-white"
              >
                {t.duplicateCancel}
              </button>
            </div>
          </div>
        ) : null}

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
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
          {t.previewTitle}
        </p>
        <EventPreviewCard values={values} locale={locale} dict={dict} />
        <p className="mt-2 text-xs leading-relaxed text-muted">{t.previewHint}</p>
      </aside>
    </div>
  );
}
