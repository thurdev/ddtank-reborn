import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Badge, Button, Card, EmptyState, PowerGauge, Skeleton, StatusDot, TrajectoryArc } from "@ddtank/ui";
import { Code2, Download, Gift, Layers, Play, Server } from "lucide-react";
import { configQuery, newsQuery, statusQuery, type NewsCategory } from "@/lib/api";
import { useI18n, type TKey } from "@/i18n";
import { useSeo } from "@/lib/seo";
import { fadeIn, fadeUp, stagger, viewportOnce } from "@/lib/motion";

const categoryTone: Record<NewsCategory, "sun" | "coral" | "mint" | "sky"> = {
  update: "sky",
  event: "sun",
  maintenance: "coral",
  news: "mint",
};

function ServerStatusCard() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery(statusQuery);
  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;
  const state = data.maintenance ? "maintenance" : data.online ? "online" : "offline";
  return (
    <Card className="relative w-full overflow-hidden p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-muted">{t("status.title")}</h2>
        <span className="flex items-center gap-2 text-sm font-semibold">
          <StatusDot online={state === "online"} />
          {t(`status.${state}` as TKey)}
        </span>
      </div>
      <p className="mt-4 font-display text-6xl leading-none text-ink">{data.players.toLocaleString()}</p>
      <p className="mt-1 text-sm text-muted">{t("status.players")}</p>
      <PowerGauge className="mt-5" value={data.players / Math.max(1, data.capacity)} readout={`${data.players} / ${data.capacity}`} />
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-night-deep/60 p-3">
          <dt className="text-muted">{t("status.rooms")}</dt>
          <dd className="font-display text-2xl">{data.rooms}</dd>
        </div>
        <div className="rounded-xl bg-night-deep/60 p-3">
          <dt className="text-muted">{t("status.version")}</dt>
          <dd className="font-mono text-lg">{data.version}</dd>
        </div>
      </dl>
      {data.motd && <p className="mt-4 rounded-xl border border-sun/30 bg-sun/10 p-3 text-sm text-sun">{data.motd}</p>}
    </Card>
  );
}

function NewsList() {
  const { t, locale } = useI18n();
  const { data, isLoading } = useQuery(newsQuery);
  const fmt = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" });
  const part = (d: Date, type: "day" | "month") => fmt.formatToParts(d).find((p) => p.type === type)?.value.replace(".", "") ?? "";

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }
  if (!data?.length) return <EmptyState title={t("home.newsEmpty")} />;

  return (
    <motion.ul
      variants={stagger()}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line bg-panel"
    >
      {data.map((n) => {
        const date = new Date(n.publishedAt);
        const day = part(date, "day");
        const month = part(date, "month");
        return (
          <motion.li variants={fadeUp} key={n.id} className="flex gap-5 p-5 transition-colors hover:bg-panel-2/40">
            <time dateTime={n.publishedAt} className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-night-deep/70 py-2">
              <span className="font-display text-2xl leading-none text-sun">{day}</span>
              <span className="text-xs uppercase text-muted">{month}</span>
            </time>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={categoryTone[n.category]}>{t(`news.category.${n.category}` as TKey)}</Badge>
                <h3 className="font-display text-lg text-ink">{n.title}</h3>
              </div>
              <p className="mt-1 text-sm text-muted">{n.summary}</p>
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

const FEATURES = [
  { key: "remaster", icon: Layers, tone: "text-sun" },
  { key: "noPay", icon: Gift, tone: "text-mint" },
  { key: "openSource", icon: Code2, tone: "text-sky" },
  { key: "channels", icon: Server, tone: "text-grape" },
] as const;

function FeatureGrid() {
  const { t } = useI18n();
  return (
    <motion.div
      variants={stagger()}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {FEATURES.map(({ key, icon: Icon, tone }) => (
        <motion.div key={key} variants={fadeUp}>
          <Card className="h-full p-5 transition-transform hover:-translate-y-1">
            <Icon className={`size-8 ${tone}`} aria-hidden />
            <h3 className="font-display mt-3 text-lg text-ink">{t(`home.features.${key}.title` as TKey)}</h3>
            <p className="mt-1 text-sm text-muted">{t(`home.features.${key}.body` as TKey)}</p>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Hero background art: the two-squad night battlefield scene already used on the Play page
 *  (`apps/web/public/play/bg-*`), reused here as the home hero's illustration. A dedicated hero crop
 *  can replace it later — see "Arte pendente" in apps/web/README.md. */
function HeroArt() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, 90]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.div style={{ y }} className="absolute inset-0 scale-110">
        <picture>
          <source srcSet="/play/bg-2560.avif 2560w, /play/bg-1280.avif 1280w" type="image/avif" />
          <source srcSet="/play/bg-2560.webp 2560w, /play/bg-1280.webp 1280w" type="image/webp" />
          <img
            src="/play/bg-1280.webp"
            alt=""
            aria-hidden
            fetchPriority="high"
            sizes="100vw"
            className="h-full w-full object-cover object-[center_30%]"
          />
        </picture>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/70 to-night/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-night via-night/40 to-transparent" />
      <div className="bg-starfield animate-drift absolute inset-0 opacity-40 mix-blend-screen" />
    </div>
  );
}

export function HomePage() {
  const { t } = useI18n();
  const { data: config } = useQuery(configQuery);
  useSeo({ title: "DDTank Reborn", description: t("home.lead"), image: "/play/bg-1280.webp" });

  return (
    <>
      <section className="relative overflow-hidden border-b border-line/60">
        <HeroArt />
        <TrajectoryArc className="pointer-events-none absolute -left-10 top-10 hidden w-[70%] text-sun/20 lg:block" />
        <motion.div
          variants={stagger(0.05)}
          initial="hidden"
          animate="show"
          className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.4fr_1fr] lg:py-28"
        >
          <div>
            <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.2em] text-mint">
              {t("home.eyebrow")}
            </motion.p>
            <motion.h1 variants={fadeUp} className="title-plate mt-4 text-5xl leading-[0.95] text-ink sm:text-6xl lg:text-7xl">
              {t("home.title")}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg text-muted">
              {t("home.lead")}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="xl" asChild>
                <Link to="/play">
                  <Play /> {t("home.play")}
                </Link>
              </Button>
              {config?.launcherUrl && (
                <div className="flex flex-col gap-1">
                  <Button variant="secondary" size="lg" asChild>
                    <a href={config.launcherUrl} download>
                      <Download /> {t("home.download")}
                    </a>
                  </Button>
                  <span className="pl-1 text-xs text-muted">{t("home.downloadHint")}</span>
                </div>
              )}
            </motion.div>
          </div>
          <motion.div variants={fadeIn}>
            <ServerStatusCard />
          </motion.div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="title-plate mb-6 text-3xl">{t("home.features.title")}</h2>
        <FeatureGrid />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="title-plate mb-6 text-3xl">{t("home.news")}</h2>
        <NewsList />
      </section>
    </>
  );
}
