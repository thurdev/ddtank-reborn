import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Badge, Button, Card, EmptyState, PowerGauge, Skeleton, StatusDot, TrajectoryArc } from "@ddtank/ui";
import { Download, Heart, Play, UserPlus, Gamepad2, LogIn } from "lucide-react";
import { configQuery, newsQuery, statusQuery, type NewsCategory } from "@/lib/api";
import { useI18n, type TKey } from "@/i18n";
import { useSeo } from "@/lib/seo";
import { fadeIn, fadeUp, stagger, viewportOnce } from "@/lib/motion";
import { YouTubeFacade } from "@/components/YouTubeFacade";
import { Gallery, type GalleryImage } from "@/components/Gallery";
import { GithubMark } from "@/components/GithubMark";
import { GITHUB_URL, TRAILER_YOUTUBE_ID, BUY_ME_A_COFFEE_URL } from "@/lib/links";

const categoryTone: Record<NewsCategory, "sun" | "coral" | "mint" | "sky"> = {
  update: "sky",
  event: "sun",
  maintenance: "coral",
  news: "mint",
};

/** Versão compacta do card de status — a cheia (grid 2x2 + MOTD) foi pro meio da hero antes; agora a hero é
 *  a key art em tela cheia + CTA, então o status vira uma faixa pequena flutuando por cima, não o elemento
 *  dominante (pedido do dono: "o card de status ao vivo pode continuar, só que menor"). */
function ServerStatusStrip() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery(statusQuery);
  if (isLoading || !data) return <Skeleton className="h-20 w-full sm:w-72" />;
  const state = data.maintenance ? "maintenance" : data.online ? "online" : "offline";
  return (
    <Card className="w-full p-4 sm:w-72">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <StatusDot online={state === "online"} />
          {t(`status.${state}` as TKey)}
        </span>
        <span className="font-mono text-xs text-muted">{data.version}</span>
      </div>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-display text-3xl leading-none text-ink">{data.players.toLocaleString()}</span>
        <span className="text-xs text-muted">{t("status.players")}</span>
      </p>
      <PowerGauge className="mt-3" value={data.players / Math.max(1, data.capacity)} readout={`${data.players} / ${data.capacity}`} />
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

/** Ícones reais do jogo (não lucide) via `/api/admin/item-icons/:id.png` — a mesma rota pública que o
 *  preview de Itens no admin usa (`apps/api/src/routes/admin.ts`, comentário "Público como item-icons").
 *  IDs escolhidos à mão (não são tentativa aleatória): cada um verificado visualmente antes de entrar aqui
 *  — ver `docs/plan/SITE-ADMIN-REDESIGN.md` rodada 4 pra lista completa + por que cada um foi descartado/
 *  escolhido (ex.: evitado item cross-over de IP de terceiros, tipo "Capitão América"). */
const ITEM_ICON = (id: number) => `/api/admin/item-icons/${id}.png`;
const FEATURES = [
  { key: "remaster", icon: ITEM_ICON(7093) },
  { key: "noPay", icon: ITEM_ICON(50201) },
  { key: "openSource", icon: ITEM_ICON(112057) },
  { key: "channels", icon: ITEM_ICON(11104) },
  { key: "multiChar", icon: ITEM_ICON(12000097) },
  { key: "dungeons", icon: ITEM_ICON(30101) },
] as const;

function FeatureGrid() {
  const { t } = useI18n();
  return (
    <motion.div
      variants={stagger()}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {FEATURES.map(({ key, icon }) => (
        <motion.div key={key} variants={fadeUp}>
          <Card className="h-full p-5 transition-transform hover:-translate-y-1">
            <span className="grid size-14 place-items-center rounded-2xl border border-line bg-night-deep/60">
              <img src={icon} alt="" loading="lazy" className="size-10 object-contain" />
            </span>
            <h3 className="font-display mt-3 text-lg text-ink">{t(`home.features.${key}.title` as TKey)}</h3>
            <p className="mt-1 text-sm text-muted">{t(`home.features.${key}.body` as TKey)}</p>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Hero em tela cheia: a arte noturna de batalha já usada no Play (`public/play/bg-*`) — arte própria do
 *  projeto, não um banco de imagens — ocupa a seção inteira (não mais só um fundo atrás de texto estreito).
 *  Parallax leve no scroll, zerado com `prefers-reduced-motion` via `useReducedMotion`. */
function HeroArt() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, 110]);

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
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/75 to-night/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-night via-night/30 to-transparent" />
      <div className="bg-starfield animate-drift absolute inset-0 opacity-40 mix-blend-screen" />
    </div>
  );
}

export function HomePage() {
  const { t } = useI18n();
  const { data: config } = useQuery(configQuery);
  useSeo({ title: "DDTank Reborn", description: t("home.lead"), image: "/play/bg-1280.webp" });

  const gallery: GalleryImage[] = [
    { src: "/art/gallery/hall.webp", caption: t("home.gallery.hall") },
    { src: "/art/gallery/shop.webp", caption: t("home.gallery.shop") },
    { src: "/art/screenshot-char-select.webp", caption: t("home.gallery.charSelect") },
  ];

  return (
    <>
      <section className="relative min-h-[88vh] overflow-hidden border-b border-line/60 sm:min-h-[92vh]">
        <HeroArt />
        <TrajectoryArc className="pointer-events-none absolute -left-10 top-10 hidden w-[70%] text-sun/20 lg:block" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end gap-10 px-4 pb-14 pt-28 sm:min-h-[92vh] lg:flex-row lg:items-end lg:justify-between lg:pb-20">
          <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="max-w-xl">
            <motion.img
              variants={fadeUp}
              src="/play/logo.webp"
              alt="DDTank Reborn"
              className="h-20 w-auto object-contain drop-shadow-[0_8px_24px_rgb(0_0_0_/_0.5)] sm:h-28"
            />
            <motion.p variants={fadeUp} className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-mint">
              {t("home.eyebrow")}
            </motion.p>
            <motion.h1 variants={fadeUp} className="title-plate mt-3 text-4xl leading-[0.95] text-ink sm:text-5xl lg:text-6xl">
              {t("home.title")}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 max-w-lg text-lg text-muted">
              {t("home.lead")}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="xl" asChild>
                <Link to="/play">
                  <Play /> {t("home.play")}
                </Link>
              </Button>
              <Button size="xl" variant="secondary" asChild>
                <a href="#trailer">
                  <Gamepad2 /> {t("home.watchTrailer")}
                </a>
              </Button>
            </motion.div>
            {config?.launcherUrl && (
              <motion.div variants={fadeUp} className="mt-4 flex flex-col gap-1">
                <a href={config.launcherUrl} download className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                  <Download className="size-4" aria-hidden /> {t("home.download")}
                </a>
                <span className="pl-5.5 text-xs text-muted">{t("home.downloadHint")}</span>
              </motion.div>
            )}
          </motion.div>
          <motion.div variants={fadeIn} initial="hidden" animate="show">
            <ServerStatusStrip />
          </motion.div>
        </div>
      </section>

      <section id="trailer" className="mx-auto max-w-5xl px-4 py-14 scroll-mt-20">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce} className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint">{t("home.trailer.eyebrow")}</p>
          <h2 className="title-plate mt-3 text-3xl text-ink">{t("home.trailer.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">{t("home.trailer.body")}</p>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce} className="mt-8">
          <YouTubeFacade videoId={TRAILER_YOUTUBE_ID} title={t("home.trailer.play")} />
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="title-plate mb-6 text-3xl">{t("home.features.title")}</h2>
        <FeatureGrid />
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce} className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint">{t("home.gallery.eyebrow")}</p>
          <h2 className="title-plate mt-3 text-3xl text-ink">{t("home.gallery.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">{t("home.gallery.body")}</p>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce}>
          <Gallery images={gallery} />
        </motion.div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="title-plate mb-8 text-center text-3xl">{t("home.howTo.title")}</h2>
        <motion.div variants={stagger()} initial="hidden" whileInView="show" viewport={viewportOnce} className="grid gap-6 sm:grid-cols-3">
          {([
            { n: 1, icon: UserPlus, key: "step1" },
            { n: 2, icon: LogIn, key: "step2" },
            { n: 3, icon: Play, key: "step3" },
          ] as const).map(({ n, icon: Icon, key }) => (
            <motion.div key={key} variants={fadeUp} className="relative flex flex-col items-center text-center">
              <span className="grid size-16 place-items-center rounded-full border-2 border-sun/40 bg-sun/10 text-sun">
                <Icon className="size-7" aria-hidden />
              </span>
              <span className="absolute -top-1 right-1/2 translate-x-7 rounded-full bg-sun px-2 py-0.5 font-display text-xs text-night-deep">
                {n}
              </span>
              <h3 className="font-display mt-4 text-lg text-ink">{t(`home.howTo.${key}.title` as TKey)}</h3>
              <p className="mt-1 max-w-[22ch] text-sm text-muted">{t(`home.howTo.${key}.body` as TKey)}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce}>
          <Card className="overflow-hidden p-8 text-center">
            <GithubMark className="mx-auto size-10 text-ink" aria-hidden />
            <h2 className="title-plate mt-4 text-2xl text-ink">{t("home.openSource.title")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">{t("home.openSource.body")}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  <GithubMark className="size-4" aria-hidden /> {t("home.openSource.githubCta")}
                </a>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer">
                  <Heart /> {t("home.openSource.supportCta")}
                </a>
              </Button>
            </div>
            <div className="mx-auto mt-8 max-w-xl border-t border-line/60 pt-6 text-left">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{t("home.openSource.creditsTitle")}</h3>
              <p className="mt-2 text-sm text-muted">{t("home.openSource.creditsBody")}</p>
            </div>
          </Card>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="title-plate mb-6 text-3xl">{t("home.news")}</h2>
        <NewsList />
      </section>
    </>
  );
}
