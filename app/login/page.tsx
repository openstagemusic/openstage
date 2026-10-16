import Link from "next/link";

import LoginForm from "@/components/auth/LoginForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.auth.loginTitle,
    description: dict.auth.loginSubtitle,
  }));

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const params = await searchParams;
  // Solo percorsi interni: evita redirect aperti verso altri domini.
  const nextPath =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : null;

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">{dict.auth.loginTitle}</h1>
      <p className="mt-2 text-sm text-muted">{dict.auth.loginSubtitle}</p>

      <LoginForm dict={dict.auth} nextPath={nextPath} />

      <p className="mt-6 text-sm text-muted">
        {dict.auth.noAccount}{" "}
        <Link href="/register" className="text-cyan hover:underline">
          {dict.nav.register}
        </Link>
      </p>
    </section>
  );
}
