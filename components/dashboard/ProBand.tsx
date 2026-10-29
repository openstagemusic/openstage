import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { ProAccess } from "@/lib/pro/queries";

/**
 * La fascia Pro nella panoramica. Vive solo nella dashboard di artisti e
 * locali: niente card promozionale, niente prezzi, nessun riferimento pubblico.
 */
export default function ProBand({
  access,
  dict,
  locale,
}: {
  access: ProAccess | null;
  dict: Dictionary["dashboard"];
  locale: "it" | "en";
}) {
  const date = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
  });

  return (
    <section className="mt-10 border-y border-line bg-white/[0.02]">
      <div className="flex flex-col gap-5 px-5 py-7 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
            {dict.proBandEyebrow}
          </p>
          <h2 className="mt-2 font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-4xl">
            {dict.proBandTitle}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            {access?.active ? dict.proBandActiveText : dict.proBandText}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2">
          {access?.active ? (
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-cyan">
              {dict.proBandActive} {date.format(new Date(access.validUntil))}
            </p>
          ) : null}

          <LocaleLink
            href="/dashboard/pro"
            className="inline-flex min-h-11 items-center border-b border-line-strong pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:border-cyan hover:text-cyan"
          >
            {access?.active ? dict.proBandOpen : dict.proBandCta}{" "}
            <span aria-hidden="true">→</span>
          </LocaleLink>
        </div>
      </div>
    </section>
  );
}
