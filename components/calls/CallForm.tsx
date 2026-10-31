"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createCallAction, type CallActionResult } from "@/app/actions/calls";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Pubblicazione di una chiamata.
 *
 * Il tetto di candidature è una scelta dell'autore, non un default nascosto:
 * sta nel modulo, si può cambiare dopo, e il database lo fa rispettare.
 */
export default function CallForm({
  dict,
  cities,
}: {
  dict: Dictionary["calls"]["dashboard"];
  cities: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorText: Record<NonNullable<CallActionResult["error"]>, string> = {
    auth: dict.verifiedOnly,
    role: dict.verifiedOnly,
    page: dict.verifiedOnly,
    verified: dict.verifiedOnly,
    invalid: dict.oneOpen,
    alreadyOpen: dict.oneOpen,
    closed: dict.oneOpen,
    full: dict.oneOpen,
    duplicate: dict.oneOpen,
    self: dict.oneOpen,
    failed: dict.oneOpen,
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = event.currentTarget;
    const result = await createCallAction(new FormData(form));
    setBusy(false);

    if (!result.ok) {
      setError(result.error ? errorText[result.error] : dict.oneOpen);
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="call-title" className="os-field-label">
          {dict.fieldTitle}
        </label>
        <input
          id="call-title"
          name="title"
          required
          minLength={4}
          maxLength={120}
          placeholder="Es. Cerchiamo band per serata indie"
          className="os-field text-sm"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="call-body" className="os-field-label">
          {dict.fieldBody}
        </label>
        <textarea
          id="call-body"
          name="body"
          required
          minLength={30}
          maxLength={2000}
          rows={4}
          placeholder="Spazio, pubblico, backline, orari, cosa ti serve davvero."
          className="os-field text-sm"
        />
      </div>

      <div>
        <label htmlFor="call-role" className="os-field-label">
          {dict.fieldRole}
        </label>
        <select id="call-role" name="roleWanted" className="os-field text-sm" defaultValue="artist">
          <option value="artist">Artista</option>
          <option value="band">Band</option>
          <option value="dj">DJ</option>
          <option value="performer">Performance</option>
          <option value="technician">Tecnico</option>
          <option value="other">Altro</option>
        </select>
      </div>

      <div>
        <label htmlFor="call-compensation" className="os-field-label">
          {dict.fieldCompensation}
        </label>
        <select
          id="call-compensation"
          name="compensation"
          className="os-field text-sm"
          defaultValue="tbd"
        >
          <option value="paid">Compenso</option>
          <option value="door_split">Split incasso</option>
          <option value="unpaid">Non retribuito</option>
          <option value="tbd">Da concordare</option>
        </select>
      </div>

      <div>
        <label htmlFor="call-fee" className="os-field-label">
          {dict.fieldFee}
        </label>
        <input
          id="call-fee"
          name="feeText"
          maxLength={120}
          placeholder="Es. 300 € o split 70/30"
          className="os-field text-sm"
        />
        <p className="mt-1 text-xs text-muted">{dict.feeHint}</p>
      </div>

      <div>
        <label htmlFor="call-city" className="os-field-label">
          {dict.fieldCity}
        </label>
        <input
          id="call-city"
          name="city"
          list="call-cities"
          maxLength={80}
          placeholder="Milano"
          className="os-field text-sm"
        />
        <datalist id="call-cities">
          {cities.slice(0, 60).map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor="call-from" className="os-field-label">
          {dict.fieldFrom}
        </label>
        <input id="call-from" name="periodStart" type="date" className="os-field text-sm" />
      </div>

      <div>
        <label htmlFor="call-to" className="os-field-label">
          {dict.fieldTo}
        </label>
        <input id="call-to" name="periodEnd" type="date" className="os-field text-sm" />
      </div>

      <div>
        <label htmlFor="call-max" className="os-field-label">
          {dict.fieldMax}
        </label>
        <input
          id="call-max"
          name="maxApplications"
          type="number"
          min={1}
          max={50}
          defaultValue={10}
          className="os-field text-sm"
        />
        <p className="mt-1 text-xs text-muted">{dict.maxHint}</p>
      </div>

      <div>
        <label htmlFor="call-days" className="os-field-label">
          {dict.fieldDays}
        </label>
        <input
          id="call-days"
          name="expiresInDays"
          type="number"
          min={7}
          max={60}
          defaultValue={30}
          className="os-field text-sm"
        />
      </div>

      {error ? (
        <p role="alert" className="os-note os-note-pink sm:col-span-2">
          {error}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 bg-violet-strong px-5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
        >
          {busy ? dict.creating : dict.create}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
