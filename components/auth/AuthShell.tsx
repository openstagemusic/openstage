import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  accent: string;
  lead: string;
  tagline: string;
  values: string[];
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Guscio editoriale di accesso e registrazione.
 *
 * Riprende la Home 5.4 senza copiarla: titolo-poster, etichette mono e pannello
 * sobrio per il form. Su mobile il form resta vicino al titolo; su desktop le
 * due colonne danno respiro senza nascondere nulla dietro JavaScript.
 */
export default function AuthShell({
  eyebrow,
  title,
  accent,
  lead,
  tagline,
  values,
  children,
  footer,
}: AuthShellProps) {
  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-start lg:gap-16">
        <div className="border-b border-line pb-8 lg:border-b-0 lg:pb-0 lg:pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{eyebrow}</p>

          <h1 className="mt-4 max-w-3xl font-poster text-[clamp(3rem,12vw,6.5rem)] uppercase leading-[0.9] tracking-[-0.03em]">
            {title}
            <span className="block text-pink">{accent}</span>
          </h1>

          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted sm:text-base">{lead}</p>

          <ul className="mt-10 hidden max-w-md border-t border-line sm:block">
            {values.map((value, index) => (
              <li key={value} className="flex items-baseline gap-4 border-b border-line py-3">
                <span className="font-mono text-[10px] tracking-[0.16em] text-cyan">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {value}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-10 hidden font-mono text-[9px] uppercase tracking-[0.18em] text-muted/70 lg:block">
            {tagline}
          </p>
        </div>

        <div className="w-full justify-self-end lg:max-w-md">
          <div className="border border-line bg-surface/70 p-5 sm:p-7">{children}</div>
          {footer ? <div className="mt-5 text-sm text-muted">{footer}</div> : null}
        </div>
      </div>
    </section>
  );
}
