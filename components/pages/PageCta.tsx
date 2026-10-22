import Link from "@/components/i18n/LocaleLink";

type PageCtaProps = {
  title: string;
  text: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  tertiary?: { label: string; href: string };
};

/**
 * La chiusura delle pagine pubbliche: un ultimo gesto, non un banner.
 */
export default function PageCta({ title, text, primary, secondary, tertiary }: PageCtaProps) {
  return (
    <section className="border-t border-line">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="max-w-2xl font-poster text-4xl uppercase leading-[0.92] tracking-[-0.01em] sm:text-6xl">
            {title}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{text}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={primary.href}
            className="inline-flex rounded-none bg-violet-strong px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet"
          >
            {primary.label}
          </Link>
          {secondary ? (
            <Link
              href={secondary.href}
              className="inline-flex border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
            >
              {secondary.label}
            </Link>
          ) : null}
          {tertiary ? (
            <Link
              href={tertiary.href}
              className="inline-flex border-b border-line-strong pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:text-cyan"
            >
              {tertiary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
