"use client";

import { useState, useTransition } from "react";

import { updateNotificationPreferencesAction } from "@/app/actions/notifications";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { NotificationPreferences } from "@/lib/notifications/preferences";

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border-b border-line py-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded-none border border-line bg-surface accent-cyan"
      />
      <span>
        <span className="block text-sm text-white">{label}</span>
        {hint ? <span className="mt-1 block text-xs leading-relaxed text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export default function PreferencesForm({
  preferences,
  dict,
}: {
  preferences: NotificationPreferences;
  dict: Dictionary["notifications"];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setMessage(null);
        startTransition(async () => {
          const outcome = await updateNotificationPreferencesAction(formData);
          setMessage(
            outcome.ok
              ? { tone: "ok", text: dict.preferencesSaved }
              : { tone: "error", text: dict.preferencesFailed }
          );
        });
      }}
      className="mt-6 max-w-2xl"
    >
      <fieldset>
        <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
          {dict.preferencesInApp}
        </legend>
        <Toggle
          name="in_app_event_cancelled"
          label={dict.preferencesCancelled}
          defaultChecked={preferences.inAppEventCancelled}
        />
        <Toggle
          name="in_app_event_updated"
          label={dict.preferencesUpdated}
          defaultChecked={preferences.inAppEventUpdated}
        />
        <Toggle
          name="in_app_follows"
          label={dict.preferencesFollows}
          defaultChecked={preferences.inAppFollows}
        />
      </fieldset>

      <fieldset className="mt-8">
        <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
          {dict.preferencesEmail}
        </legend>
        <Toggle
          name="email_digest"
          label={dict.preferencesDigest}
          hint={dict.preferencesDigestHint}
          defaultChecked={preferences.emailDigest}
        />
        <Toggle
          name="email_urgent"
          label={dict.preferencesUrgent}
          hint={dict.preferencesUrgentHint}
          defaultChecked={preferences.emailUrgent}
        />
      </fieldset>

      <p className="mt-4 border-l-2 border-line-strong bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-muted">
        {dict.preferencesNote}
      </p>

      {message ? (
        <p
          role="status"
          className={
            message.tone === "ok"
              ? "mt-4 border-l-2 border-cyan bg-cyan/10 px-4 py-3 text-sm text-white"
              : "mt-4 border-l-2 border-pink bg-pink/10 px-4 py-3 text-sm text-white"
          }
        >
          {message.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-11 items-center border border-violet-strong bg-violet-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet disabled:opacity-50"
      >
        {dict.preferencesSave}
      </button>
    </form>
  );
}
