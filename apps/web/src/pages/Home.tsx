import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Card, EmptyState, PowerGauge, Skeleton, StatusDot, TrajectoryArc } from "@ddtank/ui";
import { Download, Play } from "lucide-react";
import { configQuery, newsQuery, statusQuery, type NewsCategory } from "@/lib/api";
import { useI18n, type TKey } from "@/i18n";

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
    <ul className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line bg-panel">
      {data.map((n) => {
        const [day, month] = fmt.format(new Date(n.publishedAt)).split(/\s+/);
        return (
          <li key={n.id} className="flex gap-5 p-5 transition-colors hover:bg-panel-2/40">
            <time dateTime={n.publishedAt} className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-night-deep/70 py-2">
              <span className="font-display text-2xl leading-none text-sun">{day}</span>
              <span className="text-xs uppercase text-muted">{month?.replace(".", "")}</span>
            </time>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={categoryTone[n.category]}>{t(`news.category.${n.category}` as TKey)}</Badge>
                <h3 className="font-display text-lg text-ink">{n.title}</h3>
              </div>
              <p className="mt-1 text-sm text-muted">{n.summary}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function HomePage() {
  const { t } = useI18n();
  const { data: config } = useQuery(configQuery);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line/60 bg-starfield animate-drift">
        <TrajectoryArc className="absolute -left-10 top-10 hidden w-[70%] text-sun/25 lg:block" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.4fr_1fr] lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint">{t("home.eyebrow")}</p>
            <h1 className="title-plate mt-4 text-5xl leading-[0.95] text-ink sm:text-6xl lg:text-7xl">{t("home.title")}</h1>
            <p className="mt-6 max-w-xl text-lg text-muted">{t("home.lead")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
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
            </div>
          </div>
          <ServerStatusCard />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="title-plate mb-6 text-3xl">{t("home.news")}</h2>
        <NewsList />
      </section>
    </>
  );
}
