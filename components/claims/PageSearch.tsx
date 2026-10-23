import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";

import { authInputClass, authLabelClass } from "@/components/auth/formStyles";

export type PageSearchResult = {
  id: string;
  name: string;
  city: string | null;
  href: string;
};

/**
 * La ricerca della propria scheda, in cima al primo passo di un artista o di un
 * locale.
 *
 * Serve a rompere il vizio di nascita del doppione: chi arriva cerca il suo
 * nome e, se la scheda esiste già, la reclama; solo se non c'è ne crea una. Il
 * modulo è un normale invio `?q=`, quindi la pagina resta una Server Component
 * e i risultati sono già nell'HTML — niente dati inventati, solo schede reali.
 */
export default function PageSearch({
  kind,
  term,
  results,
  ownedName = null,
  dict,
}: {
  kind: "artist" | "venue";
  term: string;
  results: PageSearchResult[];
  /** La propria scheda senza eventi: reclamandone un'altra viene eliminata. */
  ownedName?: string | null;
  dict: Dictionary["onboarding"];
}) {
  const isArtist = kind === "artist";

  return (
    <div className="border border-line bg-surface/40 p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">{dict.pageSearchTitle}</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {isArtist ? dict.pageSearchArtistText : dict.pageSearchVenueText}
      </p>

      {ownedName ? (
        <p className="mt-4 border-l-2 border-pink bg-pink/10 px-3 py-3 text-xs leading-relaxed text-white">
          {isArtist ? dict.pageSearchArtistOwned : dict.pageSearchVenueOwned}
          <span className="mt-1 block text-muted">«{ownedName}»</span>
        </p>
      ) : null}

      <form method="get" className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="page-search" className={authLabelClass}>
            {dict.pageSearchLabel}
          </label>
          <input
            id="page-search"
            name="q"
            defaultValue={term}
            placeholder={
              isArtist ? dict.pageSearchArtistPlaceholder : dict.pageSearchVenuePlaceholder
            }
            className={authInputClass}
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center border border-cyan/50 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-cyan/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          {dict.pageSearchCta}
        </button>
      </form>

      {term ? (
        results.length > 0 ? (
          <ul className="mt-5 border-t border-line">
            {results.map((result) => (
              <li
                key={result.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
              >
                <span className="text-sm text-white">
                  {result.name}
                  {result.city ? <span className="text-muted"> · {result.city}</span> : null}
                </span>
                <LocaleLink
                  href={result.href}
                  className="font-mono text-[10px] uppercase tracking-[0.1em] text-cyan transition-opacity hover:opacity-80"
                >
                  {dict.pageSearchResultCta} →
                </LocaleLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-xs text-muted">{dict.pageSearchEmpty}</p>
        )
      ) : null}
    </div>
  );
}
