import { useId, useMemo, useRef, useState } from "react";
import type { Series } from "@/lib/api";

interface Props {
  title: string;
  data: Series[];
  /** Upper bound of the y scale (e.g. 100 for %). */
  max: number;
  unit: string;
  /** CSS color for the single series (a chart token). */
  color: string;
  locale: string;
  caption?: string;
}

const W = 600;
const H = 180;
const PAD = { l: 36, r: 8, t: 10, b: 22 };

/** Single-series area chart with crosshair tooltip and an sr-only table view. */
export function TimeSeriesChart({ title, data, max, unit, color, locale, caption }: Props) {
  const gid = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { pts, line, area } = useMemo(() => {
    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const n = Math.max(1, data.length - 1);
    const pts = data.map((d, i) => ({
      x: PAD.l + (i / n) * iw,
      y: PAD.t + ih - (Math.min(max, Math.max(0, d.v)) / max) * ih,
      d,
    }));
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = pts.length ? `${line} L${pts[pts.length - 1]!.x},${PAD.t + ih} L${pts[0]!.x},${PAD.t + ih} Z` : "";
    return { pts, line, area };
  }, [data, max]);

  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  const fmt = (v: number) => `${v.toLocaleString(locale, { maximumFractionDigits: 1 })}${unit}`;
  const last = data[data.length - 1];
  const hp = hover !== null ? pts[hover] : undefined;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !pts.length) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i]!.x - x) < Math.abs(pts[best]!.x - x)) best = i;
    setHover(best);
  };

  const ticks = [0, 0.5, 1].map((f) => f * max);

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-display text-lg">{title}</span>
        <span className="font-mono text-2xl text-ink">{last ? fmt(last.v) : "—"}</span>
      </figcaption>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-none"
          role="img"
          aria-label={`${title}: ${last ? fmt(last.v) : ""}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((tv) => {
            const y = PAD.t + (H - PAD.t - PAD.b) * (1 - tv / max);
            return (
              <g key={tv}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} className="stroke-line" strokeWidth="1" strokeDasharray={tv ? "3 4" : undefined} vectorEffect="non-scaling-stroke" />
                <text x={PAD.l - 6} y={y + 4} textAnchor="end" className="fill-muted text-[11px]">
                  {tv.toLocaleString(locale)}
                </text>
              </g>
            );
          })}
          {area && <path d={area} fill={`url(#${gid})`} />}
          {line && <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
          {hp && (
            <>
              <line x1={hp.x} x2={hp.x} y1={PAD.t} y2={H - PAD.b} className="stroke-muted" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </>
          )}
          {pts.length > 0 && (
            <>
              <text x={PAD.l} y={H - 6} className="fill-muted text-[11px]">
                {time.format(new Date(pts[0]!.d.t))}
              </text>
              <text x={W - PAD.r} y={H - 6} textAnchor="end" className="fill-muted text-[11px]">
                {time.format(new Date(pts[pts.length - 1]!.d.t))}
              </text>
            </>
          )}
        </svg>
        {hp && (
          <>
            <span
              className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel"
              style={{ left: `${(hp.x / W) * 100}%`, top: `${(hp.y / H) * 100}%`, background: color }}
            />
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-night-deep px-2 py-1 text-xs shadow-panel"
              style={{ left: `${Math.min(88, Math.max(12, (hp.x / W) * 100))}%` }}
            >
              <span className="text-muted">{time.format(new Date(hp.d.t))}</span> <span className="font-mono text-ink">{fmt(hp.d.v)}</span>
            </div>
          </>
        )}
      </div>
      {caption && <p className="mt-1 text-xs text-muted">{caption}</p>}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.t}>
              <th scope="row">{time.format(new Date(d.t))}</th>
              <td>{fmt(d.v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
