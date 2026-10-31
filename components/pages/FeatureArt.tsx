import { cn } from "@/lib/utils";

type Variant = "dashboard" | "calls" | "map";

/**
 * Illustrazioni di pagina.
 *
 * Sono disegni fatti in casa, non foto di repertorio: forme e linee del nostro
 * linguaggio, nessun volto stock, nessun numero inventato. Servono a respirare
 * tra un blocco di testo e l'altro, non a spiegare al posto del testo.
 */
export default function FeatureArt({
  variant,
  className,
}: {
  variant: Variant;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative w-full overflow-hidden border-t border-line bg-gradient-to-br from-violet/[0.06] via-transparent to-cyan/[0.05] pt-4",
        className
      )}
    >
      {variant === "dashboard" ? <DashboardArt /> : null}
      {variant === "calls" ? <CallsArt /> : null}
      {variant === "map" ? <MapArt /> : null}
    </div>
  );
}

function DashboardArt() {
  return (
    <svg viewBox="0 0 600 220" className="h-auto w-full">
      <defs>
        <linearGradient id="art-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* registri */}
      <g stroke="currentColor" strokeOpacity="0.12">
        <line x1="24" y1="40" x2="576" y2="40" />
        <line x1="24" y1="90" x2="576" y2="90" />
        <line x1="24" y1="140" x2="576" y2="140" />
      </g>

      {/* area */}
      <path
        d="M24 150 C 80 150, 90 120, 140 120 S 210 150, 250 132 S 320 96, 370 104 S 440 138, 480 120 S 540 90, 576 96 L 576 176 L 24 176 Z"
        fill="url(#art-area)"
      />
      <path
        d="M24 150 C 80 150, 90 120, 140 120 S 210 150, 250 132 S 320 96, 370 104 S 440 138, 480 120 S 540 90, 576 96"
        fill="none"
        stroke="#22D3EE"
        strokeWidth="2"
      />
      <circle cx="576" cy="96" r="3.5" fill="#22D3EE" />

      {/* etichette finte: barre, non numeri */}
      <g fill="currentColor" fillOpacity="0.18">
        <rect x="24" y="190" width="42" height="5" />
        <rect x="150" y="190" width="42" height="5" />
        <rect x="276" y="190" width="42" height="5" />
        <rect x="402" y="190" width="42" height="5" />
        <rect x="528" y="190" width="42" height="5" />
      </g>
    </svg>
  );
}

function CallsArt() {
  return (
    <svg viewBox="0 0 600 200" className="h-auto w-full">
      {[0, 1].map((row) => (
        <g key={row} transform={`translate(0 ${row * 86})`}>
          <line x1="24" y1="26" x2="576" y2="26" stroke="currentColor" strokeOpacity="0.14" />
          <rect x="24" y="44" width="120" height="6" fill="#8B5CF6" fillOpacity="0.55" />
          <rect x="24" y="58" width="300" height="12" fill="currentColor" fillOpacity="0.75" />
          <rect x="24" y="80" width="180" height="5" fill="currentColor" fillOpacity="0.25" />
          <rect x="470" y="58" width="106" height="12" fill="#22D3EE" fillOpacity="0.55" />
          <circle cx="576" cy="64" r="3" fill="#22D3EE" />
        </g>
      ))}
    </svg>
  );
}

function MapArt() {
  return (
    <svg viewBox="0 0 600 220" className="h-auto w-full">
      <g stroke="currentColor" strokeOpacity="0.1">
        {[0, 1, 2, 3, 4].map((row) => (
          <line key={`h${row}`} x1="24" y1={40 + row * 36} x2="576" y2={40 + row * 36} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((col) => (
          <line key={`v${col}`} x1={24 + col * 76} y1="40" x2={24 + col * 76} y2="184" />
        ))}
      </g>

      <path
        d="M120 150 C 200 120, 280 170, 360 120 S 470 70, 520 96"
        fill="none"
        stroke="#8B5CF6"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeDasharray="4 5"
      />

      {[
        { x: 120, y: 150, color: "#22D3EE" },
        { x: 360, y: 120, color: "#F472B6" },
        { x: 520, y: 96, color: "#8B5CF6" },
      ].map((pin) => (
        <g key={`${pin.x}-${pin.y}`}>
          <circle cx={pin.x} cy={pin.y} r="16" fill={pin.color} fillOpacity="0.12" />
          <circle cx={pin.x} cy={pin.y} r="6" fill={pin.color} />
          <circle cx={pin.x} cy={pin.y} r="2" fill="#07070D" />
        </g>
      ))}
    </svg>
  );
}
