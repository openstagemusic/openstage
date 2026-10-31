/**
 * Classi condivise dei moduli auth/onboarding/account: una sola pelle, nessun drift.
 *
 * Il campo è una riga sotto, non una scatola: l'aspetto vive in `globals.css`
 * (`.os-field`), così vale anche per i moduli della dashboard e i filtri.
 */
export const authInputClass = "os-field text-sm";

export const authLabelClass = "os-field-label";

export const authPrimaryButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-none bg-violet-strong px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-60";

export const authSecondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-none border-0 border-b border-line px-0 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-60";

export const authErrorClass = "os-note os-note-pink";

export const authNoticeClass = "os-note os-note-cyan";

export const authNoteClass = "os-note";
