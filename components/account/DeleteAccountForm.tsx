"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteAccountAction } from "@/app/actions/account";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Cancellazione account.
 *
 * La conferma è una parola scritta a mano ("ELIMINA"): un clic distratto non
 * basta, e la pagina dice chiaramente cosa sparisce e cosa resta.
 */
export default function DeleteAccountForm({
  dict,
}: {
  dict: Dictionary["accountDanger"];
}) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = confirmation.trim().toUpperCase() === "ELIMINA";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;

    setBusy(true);
    setError(null);

    const result = await deleteAccountAction({ confirmation });
    setBusy(false);

    if (!result.ok) {
      setError(result.error === "confirmation" ? dict.confirmError : dict.error);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-5 max-w-xl">
      <label htmlFor="delete-confirm" className="os-field-label">
        {dict.confirmLabel}
      </label>
      <input
        id="delete-confirm"
        type="text"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder="ELIMINA"
        autoComplete="off"
        className="os-field text-sm"
      />

      {error ? (
        <p role="alert" className="mt-3 os-note os-note-pink">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!ready || busy}
        className="mt-4 inline-flex min-h-11 items-center gap-2 border-b border-pink/60 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-pink transition-colors hover:border-pink disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? dict.deleting : dict.deleteCta}
      </button>
    </form>
  );
}
