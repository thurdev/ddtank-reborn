/**
 * Shared zoom-to-fit for the visual editors' game-window previews (Quests, Dungeons, Items, Events, Npcs).
 *
 * Each preview renders its window at a fixed REAL content width (e.g. 560px for the quest window, taken
 * from the original AS3 view's layout — see each page's own comment for the exact number) and uses CSS
 * `zoom` (not `transform: scale`, which leaves stale empty space) to fit that content into the pane.
 *
 * Round 2 fix (coordinator feedback): a fixed 85% default clipped/overflowed whenever the pane was narrower
 * than `contentWidth * 0.85` (seen on the quest editor at the admin's normal 1440px layout, and worse at
 * 390px). Now `zoom` defaults to "fit the pane's current width" via `ResizeObserver` on the scrollable
 * container, and only stops auto-fitting once the user manually hits +/-; the new "fit" button undoes that.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@ddtank/ui";
import { Minus, Plus, Scan } from "lucide-react";

export interface ZoomToFitOptions {
  min?: number;
  max?: number;
  /** Horizontal padding (px, both sides combined) the pane reserves around the content — subtracted before fitting. */
  padding?: number;
}

export function useZoomToFit(contentWidth: number, opts: ZoomToFitOptions = {}) {
  const { min = 0.3, max = 1.5, padding = 32 } = opts;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const manual = useRef(false);

  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el || contentWidth <= 0) return;
    const available = el.clientWidth - padding;
    if (available <= 0) return;
    setZoom(+Math.min(max, Math.max(min, available / contentWidth)).toFixed(2));
  }, [contentWidth, min, max, padding]);

  useEffect(() => {
    fit();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!manual.current) fit();
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fit` already depends on contentWidth/min/max/padding
  }, [fit]);

  const controls = (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label="Diminuir zoom"
        onClick={() => {
          manual.current = true;
          setZoom((z) => +Math.max(min, z - 0.1).toFixed(2));
        }}
      >
        <Minus className="size-4" />
      </Button>
      <span className="w-12 text-center font-mono text-xs text-muted">{Math.round(zoom * 100)}%</span>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label="Aumentar zoom"
        onClick={() => {
          manual.current = true;
          setZoom((z) => +Math.min(max, z + 0.1).toFixed(2));
        }}
      >
        <Plus className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label="Ajustar à largura do painel"
        onClick={() => {
          manual.current = false;
          fit();
        }}
      >
        <Scan className="size-4" />
      </Button>
    </div>
  );

  return { zoom, controls, containerRef };
}
