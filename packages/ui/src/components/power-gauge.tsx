import { cn } from "../cn";

export interface PowerGaugeProps {
  /** 0..1 */
  value: number;
  label?: string;
  /** Right-aligned readout, e.g. "312 / 1000". */
  readout?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TICKS =
  "repeating-linear-gradient(90deg, transparent 0 calc(10% - 2px), rgb(10 14 34 / 0.55) calc(10% - 2px) 10%)";

/**
 * The DDTank shot-power meter: a segmented bar that fills mint -> sun -> coral.
 * Used for server load, loading progress and stat bars.
 */
export function PowerGauge({ value, label, readout, size = "md", className }: PowerGaugeProps) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const h = { sm: "h-2.5", md: "h-4", lg: "h-6" }[size];
  return (
    <div className={cn("w-full", className)}>
      {(label || readout) && (
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-muted">{label}</span>
          <span className="font-mono text-ink">{readout}</span>
        </div>
      )}
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
        aria-label={label}
        className={cn("relative overflow-hidden rounded-full border-2 border-night-deep bg-night-deep", h)}
      >
        <div
          className="absolute inset-0 bg-power transition-[clip-path] duration-500 ease-out"
          style={{ clipPath: `inset(0 ${100 - v * 100}% 0 0 round 999px)` }}
        />
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: TICKS }} />
      </div>
    </div>
  );
}
