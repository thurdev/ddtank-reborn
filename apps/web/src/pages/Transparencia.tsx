import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton } from "@ddtank/ui";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { donationSummaryQuery } from "@/lib/api";
import { useI18n } from "@/i18n";
import { useSeo } from "@/lib/seo";
import { fadeUp, stagger } from "@/lib/motion";

const centsToBRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** pix-transparencia: custo mensal (opcional, preenchido no admin) x total doado no mês — bem separado do
 *  comparativo de meta que já existe em /apoiar (aqui é "quanto custa manter o servidor no ar", não "quanto
 *  falta pra meta"). Nunca mistura com nada do jogo — é só prestação de contas pro site. */
function CostBar({ totalCents, costCents }: { totalCents: number; costCents: number }) {
  const { t } = useI18n();
  const pct = Math.min(100, Math.round((totalCents / costCents) * 100));
  const covered = totalCents >= costCents;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-mono text-sun">{centsToBRL(totalCents)}</span>
        <span className="text-muted">{t("transparencia.costOf", { cost: centsToBRL(costCents) })}</span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-night-deep/60">
        <div className={`h-full rounded-full transition-[width] ${covered ? "bg-mint" : "bg-gradient-to-r from-sun to-coral"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">{covered ? t("transparencia.covered") : t("transparencia.notCovered", { pct })}</p>
    </div>
  );
}

export function TransparenciaPage() {
  const { t } = useI18n();
  const { data: summary, isLoading } = useQuery(donationSummaryQuery);
  useSeo({ title: t("transparencia.title"), description: t("transparencia.lead") });

  return (
    <motion.div variants={stagger(0, 0.08)} initial="hidden" animate="show" className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title={t("transparencia.title")} description={t("transparencia.lead")} />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !summary?.monthlyCostCents ? (
        <EmptyState title={t("transparencia.noCostTitle")}>{t("transparencia.noCostBody")}</EmptyState>
      ) : (
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle>{t("transparencia.costTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CostBar totalCents={summary.monthTotalCents} costCents={summary.monthlyCostCents} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <Card className="mt-6 border-mint/40 bg-mint/5">
          <CardContent className="flex flex-col gap-2 p-5 text-sm text-muted">
            <p>
              <Badge tone="mint" className="mr-2">
                {t("transparencia.noP2wBadge")}
              </Badge>
              {t("transparencia.noP2wBody")}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-6 flex justify-center">
        <Button asChild>
          <Link to="/apoiar">
            <Heart /> {t("transparencia.goSupport")}
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
