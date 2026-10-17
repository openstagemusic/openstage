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
      className="rounded-full border border-white/10 px-3 py-2 text-sm text-muted transition-colors hover:text-white disabled:opacity-60"
    >
      {label}
    </button>
  );
}
