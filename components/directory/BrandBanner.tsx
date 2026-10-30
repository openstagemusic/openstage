/**
 * Placeholder del banner quando non c'è una foto: sfondo OpenStage, mai una
 * foto stock. Il testo è decorativo e resta sotto il velo scuro del contenitore.
 */
export default function BrandBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center"
      style={{
        backgroundColor: "#0B0B16",
        backgroundImage:
          "radial-gradient(circle at 18% 20%, rgba(139,92,246,0.32), transparent 55%), radial-gradient(circle at 82% 75%, rgba(34,211,238,0.22), transparent 55%)",
      }}
    >
      <span
        className={
          compact
            ? "font-poster text-3xl uppercase tracking-[-0.02em] text-white/[0.10]"
            : "font-poster text-6xl uppercase tracking-[-0.02em] text-white/[0.10] sm:text-7xl"
        }
      >
        OPEN<span className="text-cyan/30">/</span>STAGE
      </span>
    </div>
  );
}
