"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { setLocale } from "@/app/actions/locale";
import { locales, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-white/10 p-0.5 text-xs"
      role="group"
      aria-label="Language"
    >
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => change(item)}
          aria-pressed={item === locale}
          disabled={pending}
          className={cn(
            "rounded-full px-2 py-1 font-medium uppercase transition-colors",
            item === locale ? "bg-white/10 text-white" : "text-muted hover:text-white"
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
