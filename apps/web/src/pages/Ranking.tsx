import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, PageHeader, Skeleton, TBody, THead, Table, Tabs, TabsList, TabsTrigger, Td, Th, Tr, cn } from "@ddtank/ui";
import { rankingQuery, type RankingType } from "@/lib/api";
import { useI18n, type TKey } from "@/i18n";

const TYPES: RankingType[] = ["level", "gp", "offer", "fight"];
const podium = ["text-sun", "text-ink/80", "text-coral"];

function RankingTable({ type }: { type: RankingType }) {
  const { t } = useI18n();
  const { data, isLoading } = useQuery(rankingQuery(type));
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data?.length) return <EmptyState title={t("ranking.empty")} />;
  return (
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
  );
}

export function RankingPage() {
  const { t } = useI18n();
  const [type, setType] = useState<RankingType>("level");
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
