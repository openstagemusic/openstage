"use client";

export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-10 items-center border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-line-strong hover:text-white print:hidden"
    >
      {label}
    </button>
  );
}
