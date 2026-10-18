import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Spinner, Switch } from "@ddtank/ui";
import { ArrowLeft, Maximize } from "lucide-react";
import { GameFrame } from "@/components/GameFrame";
import { configQuery } from "@/lib/api";
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

/** Unscaled "design" size of .play-stage (apps/web/src/pages/play.css) — kept in sync by hand (no layout
 *  measurement round-trip needed before the first paint). */
const STAGE_W = 1932;
const STAGE_H = 836;
/** Breathing room so the composition never touches the viewport edges. */
const STAGE_MARGIN = 24;

/** Scales `.play-stage` to fit the viewport via CSS transform (GPU compositing — crisp at any factor, unlike
 *  resizing the 1000x600 game canvas itself, which the frame never does: GameFrame always renders at its real
 *  1000x600 CSS size). Snapped to the nearest 0.01 so the composition's hairline borders don't shimmer between
 *  renders while the window is actively being resized. */
function useStageScale(availRef: React.RefObject<HTMLElement | null>): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = availRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth - STAGE_MARGIN * 2;
      const h = el.clientHeight - STAGE_MARGIN * 2;
      const s = Math.min(1, w / STAGE_W, h / STAGE_H);
      setScale(Math.max(0.2, Math.round(s * 100) / 100));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [availRef]);
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
  const scale = useStageScale(viewportRef);
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
            <div className="play-stage" style={{ transform: `scale(${scale})` }}>




              <div className="play-frame">
                <div className="play-frame-hole">
                  <GameFrame {...data.game} />
                </div>
              </div>




            </div>
          </div>
        )}
      </div>
    </div>
  );
}
