import Link from "@/components/i18n/LocaleLink";

import RegisterForm from "@/components/auth/RegisterForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getLocale } from "@/lib/i18n/server";

export const generateMetadata = () =>
  getPageMetadata((dict) => ({
    title: dict.auth.registerTitle,
    description: dict.auth.registerSubtitle,
  }));

export default async function RegisterPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">{dict.auth.registerTitle}</h1>
      <p className="mt-2 text-sm text-muted">{dict.auth.registerSubtitle}</p>

      <RegisterForm dict={dict.auth} />

      <p className="mt-6 text-sm text-muted">
        {dict.auth.haveAccount}{" "}
        <Link href="/login" className="text-cyan hover:underline">
          {dict.nav.login}
        </Link>
      </p>
    </section>
  );
}
