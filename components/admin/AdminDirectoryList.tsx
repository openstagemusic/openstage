import LocaleLink from "@/components/i18n/LocaleLink";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AdminDirectoryRow } from "@/lib/admin/queries";
import { artistPath, venuePath } from "@/lib/events/paths";

/**
 * Elenco schede reali (artisti o locali). Le schede senza eventi restano
 * visibili: sono quelle su cui serve aiuto, non un numero da nascondere.
 */
export default function AdminDirectoryList({
  rows,
  kind,
  dict,
}: {
  rows: AdminDirectoryRow[];
  kind: "artist" | "venue";
  dict: Dictionary["admin"];
}) {
  if (rows.length === 0) {
    return <p className="mt-5 border-l-2 border-line-strong pl-3 text-sm text-muted">{dict.directoryEmpty}</p>;
  }

  return (
    <ul className="mt-6 border-t border-line">
      {rows.map((row) => {
        const href =
          kind === "artist" ? artistPath({ slug: row.slug }) : venuePath({ slug: row.slug });

        return (
          <li key={row.id} className="border-b border-line py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <LocaleLink
                    href={href}
                    className="font-display text-lg font-semibold hover:text-cyan"
                  >
                    {row.name}
                  </LocaleLink>
                  <span
                    className={
                      row.claimed
                        ? "border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white"
                        : "border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
                    }
                  >
                    {row.claimed ? dict.directoryClaimed : dict.directoryUnclaimed}
                  </span>
                  {row.verified ? <VerifiedBadge label={dict.userVerified} /> : null}
                  {row.suspended ? (
                    <span className="border border-pink/50 bg-pink/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-pink">
                      {dict.userSuspended}
                    </span>
                  ) : null}
                </div>

                <p className="mt-1.5 text-xs text-muted">
                  {row.city ?? "—"}
                  {row.genre ? ` · ${row.genre}` : ""}
                </p>
              </div>

              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                {row.eventCount === 0
                  ? dict.directoryNoEvents
                  : `${row.eventCount} ${
                      row.eventCount === 1 ? dict.directoryEventSingular : dict.directoryEvents
                    }`}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
