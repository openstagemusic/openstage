import { cn } from "@/lib/utils";

type EventCoverProps = {
  /** Vuoto quando l'evento non ha ancora una locandina. */
  src: string | null;
  /** Forma e dimensioni del riquadro: la foto si adatta, non si taglia mai. */
  className?: string;
};

/**
 * La locandina, **intera**.
 *
 * La forma del riquadro la decide la scheda (quadrata negli elenchi, alta nella
 * pagina evento); dentro, la foto si adatta senza essere tagliata. I bordi che
 * restano liberi si riempiono con la stessa foto sfocata: nessuna fascia vuota,
 * nessun poster mozzato.
 *
 * Vale per tutte le locandine, comprese quelle che arrivano da un indirizzo
 * esterno (gli eventi inseriti prima che esistesse il caricamento dei file).
 *
 * Senza locandina il riquadro resta, con il fondo di OpenStage: la griglia degli
 * elenchi non si scompone e la scheda non sembra rotta, sembra in attesa.
 */
export default function EventCover({ src, className }: EventCoverProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-surface",
          className
        )}
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-violet/25 via-cyan/10 to-pink/25"
          aria-hidden="true"
        />
        <span className="relative font-display text-sm font-semibold tracking-wide text-white/50">
          OpenStage
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-violet/10 via-surface to-cyan/10", className)}>
      {/* Sul telefono la copia sfocata non serve: una sola immagine, meno lavoro. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- locandine da URL arbitrari */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="absolute inset-0 hidden h-full w-full scale-110 object-cover opacity-40 blur-xl sm:block"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- locandine da URL arbitrari */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="relative h-full w-full object-contain"
      />
    </div>
  );
}
