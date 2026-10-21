import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import "./globals.css";

import Footer from "@/components/layout/Footer";
import MobileTabBar from "@/components/layout/MobileTabBar";
import Navbar from "@/components/layout/Navbar";
import SpotifyPlayerDock from "@/components/layout/SpotifyPlayerDock";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCurrentPath, getLocale } from "@/lib/i18n/server";
import { getSessionProfile } from "@/lib/supabase/session";

// Every public page is server-rendered (SSR) — never a client-only SPA.
export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();

function resolveSiteUrl(): URL {
  try {
    return new URL(siteUrl);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const base = resolveSiteUrl();
  const path = await getCurrentPath();

  // Ogni lingua ha il suo indirizzo: il canonical dice qual è, `hreflang`
  // collega le due versioni. Senza, Google vedrebbe una sola lingua.
  const localized = (target: "it" | "en") =>
    new URL(`/${target}${path === "/" ? "" : path}`, base).toString();
  const canonical = localized(locale);

  return {
    metadataBase: base,
    title: { default: dict.meta.title, template: "%s · OpenStage" },
    description: dict.meta.description,
    alternates: {
      canonical,
      languages: {
        it: localized("it"),
        en: localized("en"),
        "x-default": localized("it"),
      },
    },
    openGraph: {
      type: "website",
      siteName: "OpenStage",
      url: canonical,
      locale: locale === "it" ? "it_IT" : "en_US",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    // Le anteprime nelle chat (WhatsApp, Telegram, X) usano la card grande:
    // l'immagine arriva da `opengraph-image` quando la pagina ne ha una.
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  // Un'unica lettura per richiesta (React `cache`): utente + ruolo dal database.
  const session = await getSessionProfile();

  return (
    <html lang={locale} className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#contenuto" className="skip-link">
          {dict.nav.skipToContent}
        </a>
        <LocaleProvider locale={locale}>
          <Navbar
            locale={locale}
            dict={dict.nav}
            userEmail={session?.email ?? null}
            userRole={session?.role ?? null}
          />
          <main id="contenuto" tabIndex={-1} className="flex-1 pt-16 outline-none">
            {children}
          </main>
          <Footer dict={dict.footer} />
          <MobileTabBar dict={dict.nav} userEmail={session?.email ?? null} />
          <SpotifyPlayerDock />
        </LocaleProvider>
      </body>
    </html>
  );
}
