import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button, TrajectoryArc } from "@ddtank/ui";
import { Compass, Home, Trophy } from "lucide-react";
import { useI18n } from "@/i18n";
import { useSeo } from "@/lib/seo";
import { fadeUp } from "@/lib/motion";

/**
 * site-admin-redesign (fase 3): rota desconhecida dentro do `SiteLayout` (nav/footer continuam visíveis —
 * ver `router.tsx`'s `defaultNotFoundComponent`). Sem stats/depoimentos falsos (regra da fase 3): só um
 * "você se perdeu" com o mesmo vocabulário visual do resto do site (title-plate, TrajectoryArc) e dois links
 * reais (início, ranking) — nada inventado.
 */
export function NotFoundPage() {
  const { t } = useI18n();
  useSeo({ title: t("notFound.title"), description: t("notFound.body") });

  return (
    <div className="relative mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
      <TrajectoryArc className="pointer-events-none absolute -top-6 left-1/2 w-[140%] -translate-x-1/2 text-sun/15" />
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="relative flex flex-col items-center">
        <span className="grid size-16 place-items-center rounded-2xl border-2 border-line bg-panel text-sun">
          <Compass className="size-8" aria-hidden />
        </span>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-mint">{t("notFound.eyebrow")}</p>
        <h1 className="title-plate mt-3 text-4xl text-ink sm:text-5xl">{t("notFound.title")}</h1>
        <p className="mt-4 max-w-md text-muted">{t("notFound.body")}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link to="/">
              <Home /> {t("notFound.home")}
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link to="/ranking">
              <Trophy /> {t("notFound.ranking")}
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
