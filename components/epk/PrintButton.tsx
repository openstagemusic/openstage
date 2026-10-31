"use client";

export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-10 items-center border-b border-line pb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan hover:text-cyan print:hidden"
    >
      {label}
    </button>
  );
}
