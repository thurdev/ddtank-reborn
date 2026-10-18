import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown, Medal } from "lucide-react";
import { EmptyState, PageHeader, Skeleton, TBody, THead, Table, Tabs, TabsList, TabsTrigger, Td, Th, Tr, cn } from "@ddtank/ui";
import { rankingQuery, type RankingRow, type RankingType } from "@/lib/api";
import { useI18n, type TKey } from "@/i18n";
import { useSeo } from "@/lib/seo";
import { fadeUp, stagger } from "@/lib/motion";

const TYPES: RankingType[] = ["level", "gp", "offer", "fight"];
const podium = ["text-sun", "text-ink/80", "text-coral"];

const PODIUM_STYLE = [
  { order: "sm:order-2", height: "sm:h-44", ring: "border-sun shadow-[0_0_30px_-8px_rgb(255_197_49/0.6)]", icon: Crown, iconTone: "text-sun" },
  { order: "sm:order-1", height: "sm:h-36", ring: "border-ink/40", icon: Medal, iconTone: "text-ink/70" },
  { order: "sm:order-3", height: "sm:h-32", ring: "border-coral", icon: Medal, iconTone: "text-coral" },
] as const;

function Podium({ rows }: { rows: RankingRow[] }) {
  const { t } = useI18n();
  const top3 = rows.slice(0, 3);
  if (!top3.length) return null;
  return (
    <motion.div
      variants={stagger(0, 0.1)}
      initial="hidden"
      animate="show"
      className="mb-8 grid grid-cols-1 items-end gap-3 sm:grid-cols-3"
    >
      {top3.map((r, i) => {
        const style = PODIUM_STYLE[i]!;
        const Icon = style.icon;
        return (
          <motion.div
            key={r.rank}
            variants={fadeUp}
            className={cn(
              "flex flex-col items-center justify-end rounded-2xl border-2 bg-panel p-5 text-center",
              style.order,
              style.height,
              style.ring,
            )}
          >
            <Icon className={cn("size-7", style.iconTone)} aria-hidden />
            <p className="font-display mt-1 truncate text-xl text-ink">{r.nickname}</p>
            {r.guild && <p className="truncate text-xs text-muted">{r.guild}</p>}
            <p className="font-mono mt-2 text-lg text-sun">{r.value.toLocaleString()}</p>
            <p className="text-xs uppercase tracking-wider text-muted">{t("ranking.col.value")}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function RankingTable({ type }: { type: RankingType }) {
  const { t } = useI18n();
  const { data, isLoading } = useQuery(rankingQuery(type));
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data?.length) return <EmptyState title={t("ranking.empty")} />;
  return (
    <>
      <Podium rows={data} />
      <div className="rounded-2xl border border-line bg-panel">
        <Table>
          <THead>
            <Tr>
              <Th className="w-16 text-center">{t("ranking.col.rank")}</Th>
              <Th>{t("ranking.col.nickname")}</Th>
              <Th className="hidden sm:table-cell">{t("ranking.col.guild")}</Th>
              <Th className="text-right">{t("ranking.col.level")}</Th>
              <Th className="text-right">{t("ranking.col.value")}</Th>
            </Tr>
          </THead>
          <TBody>
            {data.map((r) => (
              <Tr key={r.rank}>
                <Td className={cn("text-center font-display text-xl", podium[r.rank - 1] ?? "text-muted")}>{r.rank}</Td>
                <Td className="font-semibold">{r.nickname}</Td>
                <Td className="hidden text-muted sm:table-cell">{r.guild ?? "—"}</Td>
                <Td className="text-right font-mono">{r.level}</Td>
                <Td className="text-right font-mono">{r.value.toLocaleString()}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}

export function RankingPage() {
  const { t } = useI18n();
  const [type, setType] = useState<RankingType>("level");
  useSeo({ title: t("ranking.title"), description: t("ranking.lead") });
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <PageHeader title={t("ranking.title")} description={t("ranking.lead")} />
      <Tabs value={type} onValueChange={(v) => setType(v as RankingType)}>
        <TabsList>
          {TYPES.map((ty) => (
            <TabsTrigger key={ty} value={ty}>
              {t(`ranking.tab.${ty}` as TKey)}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="mt-4">
          <RankingTable type={type} />
        </div>
      </Tabs>
    </div>
  );
}
