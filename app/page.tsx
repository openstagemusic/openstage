import Link from "next/link";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = () => getPageMetadata((dict) => dict.meta);

export default async function HomePage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const values = [
    { title: dict.home.values.undergroundTitle, text: dict.home.values.undergroundText },
    { title: dict.home.values.ethicsTitle, text: dict.home.values.ethicsText },
    { title: dict.home.values.authenticTitle, text: dict.home.values.authenticText },
  ];

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted">
          {dict.home.badge}
        </span>

        <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          {dict.home.title}
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted">{dict.home.subtitle}</p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/artisti"
            className="rounded-full bg-gradient-to-r from-violet to-cyan px-6 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {dict.home.explore}
          </Link>
          <Link
            href="/per-gli-artisti"
            className="rounded-full border border-white/10 px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            {dict.home.forArtists}
          </Link>
          <Link
            href="/per-le-venue"
            className="rounded-full border border-white/10 px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            {dict.home.forVenues}
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-3">
          {values.map((value) => (
            <li key={value.title} className="glass rounded-3xl border border-white/10 p-6">
              <h2 className="font-display text-lg font-semibold">{value.title}</h2>
              <p className="mt-2 text-sm text-muted">{value.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
