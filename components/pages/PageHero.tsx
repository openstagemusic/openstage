import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  headline: string;
  accent?: string;
  lead: string;
  children?: ReactNode;
};

/**
 * La testata delle pagine pubbliche.
 *
 * Riprende il gesto della Home 5.4: etichetta mono, titolo-poster, testo breve.
 * Niente card e niente glass: queste pagine devono sembrare parte dello stesso
 * manifesto, non un'appendice del sito.
 */
export default function PageHero({ eyebrow, headline, accent, lead, children }: PageHeroProps) {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16">
      <div className="border-b border-line pb-10 sm:pb-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{eyebrow}</p>

        <h1 className="mt-4 max-w-5xl font-poster text-[clamp(2.25rem,9vw,7rem)] uppercase leading-[0.92] tracking-[-0.02em]">
          {headline}
          {accent ? <span className="block text-pink">{accent}</span> : null}
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{lead}</p>

        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
