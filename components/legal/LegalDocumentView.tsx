import type { LegalDocument } from "@/lib/legal/content";

/**
 * Un documento legale, nello stesso linguaggio del resto del sito.
 *
 * Testo lungo: niente glass dietro, niente colonne strette. Titolo poster,
 * sezioni numerate con filo, elenchi leggibili. Si legge anche stampato.
 */
export default function LegalDocumentView({
  document,
  locale,
}: {
  document: LegalDocument;
  locale: string;
}) {
  const labels =
    locale === "it"
      ? { updated: "Aggiornata al", footer: "i testi sono aggiornati al" }
      : { updated: "Updated on", footer: "documents updated on" };

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
        {labels.updated} {document.updated}
      </p>
      <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-6xl">
        {document.title}
      </h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        {document.intro}
      </p>

      <div className="mt-10">
        {document.sections.map((section, index) => (
          <section key={section.heading} className="border-t border-line py-7">
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-[10px] tracking-[0.12em] text-violet">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="font-display text-lg font-semibold leading-tight">
                {section.heading}
              </h2>
            </div>

            <div className="mt-3 space-y-3 pl-0 sm:pl-9">
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}

              {section.list ? (
                <ul className="space-y-2">
                  {section.list.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                      <span aria-hidden="true" className="mt-0.5 font-mono text-cyan">
                        +
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-line pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
        OpenStage · {labels.footer} {document.updated}
      </p>
    </article>
  );
}
