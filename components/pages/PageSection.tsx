import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageSectionProps = {
  number: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

/**
 * Una sezione editoriale a due colonne: numero/indice a sinistra, contenuto a
 * destra. Su mobile diventa una sola colonna, con il titolo sopra il testo.
 */
export default function PageSection({
  number,
  title,
  eyebrow,
  children,
  className,
  id,
}: PageSectionProps) {
  return (
    <section id={id} className={cn("border-t border-line py-10 sm:py-14", className)}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] lg:gap-14">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet">
            {number}
            {eyebrow ? <span className="text-muted"> / {eyebrow}</span> : null}
          </p>
          <h2 className="mt-2 max-w-md font-poster text-3xl uppercase leading-[0.95] tracking-[-0.01em] sm:text-4xl">
            {title}
          </h2>
        </div>

        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
