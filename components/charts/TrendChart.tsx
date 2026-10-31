import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export type TrendPoint = { day: string; value: number };

const ACCENTS = {
  cyan: { stroke: "#22D3EE", fill: "rgba(34,211,238,0.22)", dot: "#22D3EE" },
  violet: { stroke: "#8B5CF6", fill: "rgba(139,92,246,0.22)", dot: "#A78BFA" },
  pink: { stroke: "#F472B6", fill: "rgba(244,114,182,0.20)", dot: "#F472B6" },
} as const;

export type Accent = keyof typeof ACCENTS;

function smoothPath(coords: [number, number][]): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M ${coords[0][0]} ${coords[0][1]}`;

  let path = `M ${coords[0][0]} ${coords[0][1]}`;

  for (let index = 1; index < coords.length; index += 1) {
    const [prevX, prevY] = coords[index - 1];
    const [x, y] = coords[index];
    const midX = (prevX + x) / 2;

    // Curva morbida a metà strada: un grafico, non una spezzata da foglio di calcolo.
    path += ` C ${midX} ${prevY}, ${midX} ${y}, ${x} ${y}`;
  }

  return path;
}

function formatDay(day: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

function niceMax(value: number): number {
  if (value <= 4) return Math.max(1, value);
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

/**
 * Grafico a linea con area, in SVG puro.
 *
 * Niente librerie di charting: il budget di JavaScript resta quello di prima e
 * il grafico è leggibile anche senza idratazione. Ogni punto ha un `<title>`,
 * così il valore compare al passaggio del mouse senza aggiungere codice.
 */
export default function TrendChart({
  points,
  locale,
  label,
  accent = "cyan",
  height = 220,
  className,
}: {
  points: TrendPoint[];
  locale: Locale;
  label: string;
  accent?: Accent;
  height?: number;
  className?: string;
}) {
  const width = 1000;
  const padding = { top: 16, right: 8, bottom: 28, left: 44 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const colors = ACCENTS[accent];

  const max = niceMax(Math.max(...points.map((point) => point.value), 1));
  const lastIndex = Math.max(1, points.length - 1);

  const coords: [number, number][] = points.map((point, index) => [
    padding.left + (index / lastIndex) * innerWidth,
    padding.top + innerHeight - (point.value / max) * innerHeight,
  ]);

  const line = smoothPath(coords);
  const area =
    coords.length > 0
      ? `${line} L ${coords[coords.length - 1][0]} ${padding.top + innerHeight} L ${coords[0][0]} ${padding.top + innerHeight} Z`
      : "";

  const ticks = [0, 0.5, 1];
  const dayLabels = points.length <= 1 ? 1 : points.length <= 12 ? 4 : 6;
  const step = Math.max(1, Math.floor((points.length - 1) / Math.max(1, dayLabels - 1)));
  const xLabels = points.filter((_, index) => index % step === 0 || index === points.length - 1);

  const total = points.reduce((sum, point) => sum + point.value, 0);

  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${label}: ${total}`}
        preserveAspectRatio="none"
      >
        <title>{`${label}: ${total}`}</title>

        <defs>
          <linearGradient id={`trend-${accent}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.fill} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => {
          const y = padding.top + innerHeight - tick * innerHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeWidth={1}
              />
              <text
                x={padding.left - 10}
                y={y + 3}
                textAnchor="end"
                className="fill-current text-[10px]"
                fillOpacity={0.45}
                style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10 }}
              >
                {Math.round(max * tick)}
              </text>
            </g>
          );
        })}

        {area ? <path d={area} fill={`url(#trend-${accent})`} /> : null}
        {line ? <path d={line} fill="none" stroke={colors.stroke} strokeWidth={2} /> : null}

        {coords.map(([x, y], index) => (
          <circle key={points[index].day} cx={x} cy={y} r={8} fill="transparent">
            <title>{`${formatDay(points[index].day, locale)} — ${points[index].value}`}</title>
          </circle>
        ))}

        {coords.length > 0 ? (
          <circle
            cx={coords[coords.length - 1][0]}
            cy={coords[coords.length - 1][1]}
            r={3.5}
            fill={colors.dot}
          />
        ) : null}

        {xLabels.map((point) => {
          const index = points.indexOf(point);
          const x = padding.left + (index / lastIndex) * innerWidth;
          return (
            <text
              key={`x-${point.day}`}
              x={x}
              y={height - 8}
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10 }}
              fill="currentColor"
              fillOpacity={0.45}
            >
              {formatDay(point.day, locale)}
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
