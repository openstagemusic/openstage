import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted focus:border-violet/60";

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
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="font-display text-lg font-semibold">{dict.pageSearchTitle}</h2>
      <p className="mt-1 text-xs text-muted">
        {isArtist ? dict.pageSearchArtistText : dict.pageSearchVenueText}
      </p>

      {ownedName ? (
        <p className="mt-3 rounded-xl border border-pink/40 bg-pink/10 p-3 text-xs text-white">
          {isArtist ? dict.pageSearchArtistOwned : dict.pageSearchVenueOwned}
          <span className="mt-1 block text-muted">«{ownedName}»</span>
        </p>
      ) : null}

      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="page-search" className="text-xs text-muted">
            {dict.pageSearchLabel}
          </label>
          <input
            id="page-search"
            name="q"
            defaultValue={term}
            placeholder={
              isArtist ? dict.pageSearchArtistPlaceholder : dict.pageSearchVenuePlaceholder
            }
            className={`${inputClass} mt-1`}
          />
        </div>
        <button
          type="submit"
          className="rounded-full border border-cyan/40 px-4 py-2.5 text-sm text-white transition-colors hover:bg-cyan/10"
        >
          {dict.pageSearchCta}
        </button>
      </form>

      {term ? (
        results.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {results.map((result) => (
              <li
                key={result.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <span className="text-sm text-white">
                  {result.name}
                  {result.city ? <span className="text-muted"> · {result.city}</span> : null}
                </span>
                <LocaleLink
                  href={result.href}
                  className="text-xs text-cyan transition-opacity hover:opacity-80"
                >
                  {dict.pageSearchResultCta} →
                </LocaleLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-xs text-muted">{dict.pageSearchEmpty}</p>
        )
      ) : null}
    </div>
  );
}
