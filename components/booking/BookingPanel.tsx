import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Il blocco contatti/booking sulla scheda pubblica.
 *
 * Deve spiegare perché a volte non c'è un pulsante: scheda non reclamata,
 * visitatore non loggato, ruolo sbagliato. Solo artista e locale possono
 * scriversi; il contatto resta gratuito.
 */
export default function BookingPanel({
  subjectType,
  subjectId,
  profileId,
  viewerRole,
  isAuthenticated,
  subjectPath,
  dict,
}: {
  subjectType: "artist" | "venue";
  subjectId: string;
  profileId: string | null;
  viewerRole: string | null;
  isAuthenticated: boolean;
  /** Percorso pubblico della scheda, per tornare dopo il login. */
  subjectPath: string;
  dict: Dictionary["booking"];
}) {
  const canContact =
    isAuthenticated &&
    ((subjectType === "artist" && viewerRole === "venue") ||
      (subjectType === "venue" && viewerRole === "artist"));

  const ctaHref =
    subjectType === "artist"
      ? `/dashboard/messaggi/nuovo?artist=${subjectId}`
      : `/dashboard/messaggi/nuovo?venue=${subjectId}`;
  const ctaLabel = subjectType === "artist" ? dict.ctaArtist : dict.ctaVenue;

  return (
    <section className="mt-8 border-y border-line py-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
        {dict.sectionTitle}
      </p>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          {!profileId
            ? dict.unclaimed
            : canContact || !isAuthenticated
              ? dict.sectionLead
              : dict.onlyRoles}
        </p>

        {profileId ? (
          !isAuthenticated ? (
            <LocaleLink
              href={`/login?next=${encodeURIComponent(subjectPath)}`}
              className="inline-flex min-h-11 shrink-0 items-center border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-white"
            >
              {dict.login}
            </LocaleLink>
          ) : canContact ? (
            <LocaleLink
              href={ctaHref}
              className="inline-flex min-h-11 shrink-0 items-center border border-cyan/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan transition-colors hover:bg-cyan/10"
            >
              {ctaLabel} <span aria-hidden="true">→</span>
            </LocaleLink>
          ) : null
        ) : null}
      </div>
    </section>
  );
}
