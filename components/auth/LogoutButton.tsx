"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-none font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-white disabled:opacity-60"
    >
      {label}
    </button>
  );
}
