import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Spinner, Switch } from "@ddtank/ui";
import { ArrowLeft, Maximize } from "lucide-react";
import { GameFrame } from "@/components/GameFrame";
import { aimTablesQuery, configQuery } from "@/lib/api";
import { AimTableCard } from "@/components/AimTablePanel";
import { useI18n } from "@/i18n";
import { useSeo } from "@/lib/seo";
import "./play.css";

/** `configQuery`'s cache key already bakes in the `?client=` search param read at module load
 *  (apps/web/src/lib/api.ts), so switching clients needs a real navigation — not just React state —
 *  for every query/asset path downstream to re-resolve against the new client. A full reload is the
 *  simplest correct way to do that. */
function ClientToggle() {
  const { t } = useI18n();
  const is6600 = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("client") === "6600";

  const setClient = (next6600: boolean) => {
    const url = new URL(window.location.href);
    if (next6600) url.searchParams.set("client", "6600");
    else url.searchParams.delete("client");
    window.location.href = url.toString();
  };

  return (
    <label className="ml-2 flex items-center gap-2 text-sm text-muted" title={t("play.client.betaHint")}>
      <span className="hidden sm:inline">{t("play.client.label")}</span>
      <span className={is6600 ? "text-muted" : "text-ink font-semibold"}>{t("play.client.41")}</span>
      <Switch checked={is6600} onCheckedChange={setClient} aria-label={t("play.client.label")} />
      <span className={is6600 ? "text-ink font-semibold" : "text-muted"}>{t("play.client.6600")}</span>
      {is6600 && (
        <Badge tone="sky" className="uppercase">
          {t("play.client.betaBadge")}
        </Badge>
      )}
    </label>
  );
}

/** Design size of `public/play/ddreborn.jpg` — `.play-stage` is exactly this box, scaled as a whole (CSS transform)
 *  so the game hole and the angle-table overlays stay glued to the painted frame at any viewport size. */
const STAGE_W = 2560;
const STAGE_H = 1429;
/** Part of the art that must stay visible (logo, both table panels, frame, ruler, mascots' heads); the rest is
 *  scenery that may be cropped so the game itself gets as big as possible. Image pixels. */
const FOCUS = { x: 280, y: 150, w: 2000, h: 1080 };
/** Shift (pre-scale px) that moves the focus box's center onto the stage's center. */
const FOCUS_DX = STAGE_W / 2 - (FOCUS.x + FOCUS.w / 2);
const FOCUS_DY = STAGE_H / 2 - (FOCUS.y + FOCUS.h / 2);

/** Scales `.play-stage` so the FOCUS box fits ("contain") the available area. Snapped to 0.005 so hairline borders don't
 *  shimmer while the window is being resized. */
function useStageScale(availRef: React.RefObject<HTMLElement | null>, ready: boolean): number {
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = availRef.current;
    if (!el) return;
    const compute = () => {
      const s = Math.min(el.clientWidth / FOCUS.w, el.clientHeight / FOCUS.h);
      setScale(Math.max(0.1, Math.round(s * 200) / 200));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
    // `ready`: the viewport div only mounts once the play config has loaded — re-run then, not just on mount.
  }, [availRef, ready]);
  return scale;
}

/** Full-page game page: parchment/gold "DD Clássico" composition (background, logo, ornamental frame, angle/force
 *  reference tables, distance ruler) hosting the real Ruffle client in an exact 1000x600 hole. Auth/config fetch
 *  and the fullscreen button are unchanged from before the redesign. */
export function PlayPage() {
  const { t } = useI18n();
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { data, error, isLoading, refetch } = useQuery({ ...configQuery, staleTime: 0 });
  const scale = useStageScale(viewportRef, !!data);
  const aim = useQuery(aimTablesQuery);
  const distances = (aim.data?.distances ?? []).slice(0, 20);
  const byAngle = (a: number) => aim.data?.rows.find((r) => r.angle === a);
  // Same placement as the painted tables in ddreborn.jpg: 30/50 on the left, 20/65 on the right.
  const sides: { side: "left" | "right"; angles: number[] }[] = [
    { side: "left", angles: [30, 50] },
    { side: "right", angles: [20, 65] },
  ];
  useSeo({ title: t("nav.play"), description: t("play.needLogin") });

  const fullscreen = () => {
    void fullscreenRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={fullscreenRef} className="fixed inset-0 z-50 flex flex-col bg-night-deep">
      <div className="relative z-10 flex h-10 shrink-0 items-center gap-2 border-b border-line/60 bg-night px-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft /> {t("play.back")}
          </Link>
        </Button>
        <span className="font-display text-muted">{data?.serverName}</span>
        <ClientToggle />
        <Button variant="ghost" size="sm" className="ml-auto" onClick={fullscreen}>
          <Maximize /> {t("play.fullscreen")}
        </Button>
      </div>

      <div className="play-page-bg relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 grid place-items-center">
            <Spinner className="size-10" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <p className="title-plate text-3xl text-coral">{t("play.error")}</p>
              <Button onClick={() => void refetch()}>{t("play.retry")}</Button>
            </div>
          </div>
        )}

        {data && (
          <div ref={viewportRef} className="play-stage-viewport">
            <div className="play-stage" style={{ transform: `translate(-50%, -50%) scale(${scale}) translate(${FOCUS_DX}px, ${FOCUS_DY}px)` }}>
              {aim.data &&
                sides.map(({ side, angles }) => (
                  <div key={side} className={`play-aim ${side}`}>
                    {angles.map((a) => {
                      const row = byAngle(a);
                      return row ? <AimTableCard key={a} row={row} distances={distances} /> : null;
                    })}
                  </div>
                ))}
              <div className="play-frame-hole">
                <GameFrame {...data.game} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
