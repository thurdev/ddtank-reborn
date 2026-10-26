import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Badge, Button, cn, Spinner, StatusDot, Switch } from "@ddtank/ui";
import { ArrowLeft, Download, Maximize, Radio } from "lucide-react";
import { GameFrame } from "@/components/GameFrame";
import { aimTablesQuery, channelsQuery, configQuery, type Channel } from "@/lib/api";
import { AimTableCard } from "@/components/AimTablePanel";
import { useI18n, type TKey } from "@/i18n";
import { useSeo } from "@/lib/seo";
import { fadeUp, stagger } from "@/lib/motion";
import "./play.css";

/**
 * 6600 em stand-by (ver `docs/plan/TASKS.md`): o toggle de cliente existia desde `site-design` (`?client=6600`
 * continua funcionando via URL, nada foi removido do servidor/cliente), mas fica escondido pro jogador comum
 * enquanto a migração 6600 não volta a ser prioridade. Flip pra `true` quando ela voltar.
 */
const SHOW_6600_TOGGLE = false;

type BadgeTone = "sun" | "coral" | "mint" | "sky" | "grape" | "neutral";

/** Estado de `ChannelInfo.state` (`ddt/data/ServerInfo.as`): 1 manutenção, 2 aberto, 4 quase cheio, 5 cheio. */
function channelStateInfo(state: number, t: (k: TKey) => string): { label: string; tone: BadgeTone; blocked: boolean } {
  switch (state) {
    case 1:
      return { label: t("play.channel.state.maintenance"), tone: "coral", blocked: true };
    case 4:
      return { label: t("play.channel.state.almostFull"), tone: "sun", blocked: false };
    case 5:
      return { label: t("play.channel.state.full"), tone: "coral", blocked: true };
    default:
      return { label: t("play.channel.state.open"), tone: "mint", blocked: false };
  }
}

/**
 * site-play: tela cheia que lista os canais habilitados (mesma fonte do `ServerList.ashx`, ver
 * `apps/api/src/routes/public.ts` `channelList`) antes de abrir o cliente. Sem canal nenhum cadastrado
 * (banco novo, sem seed) pula direto pro jogo — mesmo fallback de canal único que `channelSocketProxies`
 * (`apps/api/src/routes/auth.ts`) já usa no servidor.
 */
function ChannelPicker({ onSelect }: { onSelect: (channel: Channel) => void }) {
  const { t } = useI18n();
  const { data, error, isLoading, refetch } = useQuery(channelsQuery);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-night-deep bg-starfield p-6 text-center animate-drift">
      <div className="flex flex-col items-center gap-2">
        <Radio className="size-8 text-sun" aria-hidden />
        <p className="title-plate text-3xl text-ink sm:text-4xl">{t("play.channel.title")}</p>
        <p className="max-w-md text-sm text-muted">{t("play.channel.lead")}</p>
      </div>

      {isLoading && <Spinner className="size-8" />}

      {error && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-coral">{t("play.channel.error")}</p>
          <Button onClick={() => void refetch()}>{t("play.retry")}</Button>
        </div>
      )}

      {data && data.length === 0 && <p className="text-muted">{t("play.channel.empty")}</p>}

      {data && data.length > 0 && (
        <motion.div
          variants={stagger()}
          initial="hidden"
          animate="show"
          className="grid w-full max-w-3xl gap-4 sm:grid-cols-2"
        >
          {data.map((c) => {
            const info = channelStateInfo(c.state, t);
            return (
              <motion.button
                key={c.id}
                type="button"
                variants={fadeUp}
                disabled={info.blocked}
                onClick={() => onSelect(c)}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 text-left shadow-toy",
                  "transition-[transform,box-shadow,filter] duration-100 active:translate-y-[3px] active:shadow-toy-sm hover:brightness-110",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg text-ink">{c.name}</span>
                  <Badge tone={info.tone}>{info.label}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted">
                  <StatusDot online={!info.blocked} />
                  {t("play.channel.online", { online: c.online, capacity: c.capacity })}
                </div>
                {(c.pvpOnly || c.newerServer || c.mustLevel > 0 || c.lowestLevel > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.pvpOnly && <Badge tone="coral">{t("play.channel.pvpOnly")}</Badge>}
                    {c.newerServer && <Badge tone="sky">{t("play.channel.newer")}</Badge>}
                    {(c.mustLevel > 0 || c.lowestLevel > 0) && (
                      <Badge tone="neutral">{t("play.channel.levelRange", { min: c.lowestLevel, max: c.mustLevel || "∞" })}</Badge>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

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
function useStageScale(el: HTMLElement | null): number {
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    if (!el) return;
    const compute = () => {
      const s = Math.min(el.clientWidth / FOCUS.w, el.clientHeight / FOCUS.h);
      setScale(Math.max(0.1, Math.round(s * 200) / 200));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
    // `el` comes from a callback ref: the viewport div only mounts after the config loads AND the channel picker
    // has exited (AnimatePresence mode="wait"), so measuring must follow the element itself, not a load flag.
  }, [el]);
  return scale;
}

/** Full-page game page: parchment/gold "DD Clássico" composition (background, logo, ornamental frame, angle/force
 *  reference tables, distance ruler) hosting the real Ruffle client in an exact 1000x600 hole. Auth/config fetch
 *  and the fullscreen button are unchanged from before the redesign. site-play: a channel picker (`ChannelPicker`
 *  above) gates the game itself — selecting a channel is what reveals this stage. */
export function PlayPage() {
  const { t } = useI18n();
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ ...configQuery, staleTime: 0 });
  const channels = useQuery(channelsQuery);
  const [channel, setChannel] = useState<Channel | null>(null);
  const scale = useStageScale(viewportEl);
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

  // Nenhum canal cadastrado (banco novo, sem seed): pula o seletor, igual ao fallback de canal único do
  // servidor (`channelSocketProxies`). `channels.data` só vem `undefined` enquanto carrega/falha.
  const skipPicker = channels.data?.length === 0;
  const needsPicker = !channel && !skipPicker;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        {needsPicker ? (
          <motion.div key="picker" exit={{ opacity: 0 }} className="fixed inset-0 z-50">
            <ChannelPicker onSelect={setChannel} />
          </motion.div>
        ) : (
          <motion.div
            key="stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            ref={fullscreenRef}
            className="fixed inset-0 z-50 flex flex-col bg-night-deep"
          >
            <div className="relative z-10 flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-line/60 bg-night px-2 sm:gap-2">
              <Button variant="ghost" size="sm" className="shrink-0" asChild>
                <Link to="/">
                  <ArrowLeft /> <span className="hidden sm:inline">{t("play.back")}</span>
                </Link>
              </Button>
              <span className="hidden shrink-0 font-display text-muted md:inline">{data?.serverName}</span>
              {channel && !skipPicker && (
                <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setChannel(null)} title={t("play.channel.change")}>
                  <Radio /> {channel.name}
                  <span className="sr-only">{t("play.channel.change")}</span>
                </Button>
              )}
              {SHOW_6600_TOGGLE && <ClientToggle />}
              {data?.launcherUrl && (
                <Button variant="ghost" size="sm" className="shrink-0" asChild>
                  <a href={data.launcherUrl} download>
                    <Download /> <span className="hidden sm:inline">{t("play.download")}</span>
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="ml-auto shrink-0" onClick={fullscreen}>
                <Maximize /> <span className="hidden sm:inline">{t("play.fullscreen")}</span>
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
                <div ref={setViewportEl} className="play-stage-viewport">
                  <div
                    className="play-stage"
                    style={{ transform: `translate(-50%, -50%) scale(${scale}) translate(${FOCUS_DX}px, ${FOCUS_DY}px)` }}
                  >
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
                      <GameFrame {...data.game} channelWsUrl={channel?.wsUrl} />
                    </div>
                    {channel && !data.game.pixiUrl && <p className="play-ruffle-hint">{t("play.channel.ruffleHint")}</p>}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
