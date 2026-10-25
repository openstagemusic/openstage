import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { UserRole } from "@/lib/auth/roles";

/**
 * Il blocco per chi ha il ruolo giusto ma non la scheda.
 *
 * Succede dopo un unclaim: la scheda torna a OpenStage, il ruolo resta. Senza
 * scheda non si creano eventi (il database lo impedisce), quindi invece del
 * modulo si mostra la strada per ricrearla.
 */
export default function NeedsPageNotice({
  role,
  dict,
}: {
  role: UserRole;
  dict: Dictionary["dashboard"];
}) {
  const artist = role === "artist";

  return (
    <div className="border border-line bg-surface/50 p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-pink">
        {dict.noPageTitle}
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{dict.noPageText}</p>
      <LocaleLink
        href={artist ? "/onboarding/artist" : "/onboarding/venue"}
        className="mt-5 inline-flex min-h-11 items-center justify-center border border-violet-strong bg-violet-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
      >
        {artist ? dict.noPageArtistCta : dict.noPageVenueCta}
      </LocaleLink>
    </div>
  );
}
