import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Spinner } from "@ddtank/ui";
import { ArrowLeft, Maximize } from "lucide-react";
import { GameFrame } from "@/components/GameFrame";
import { configQuery } from "@/lib/api";
import { useI18n } from "@/i18n";

/** Full-screen game page. The config (with per-session flashvars) comes from GET /api/public/config. */
export function PlayPage() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const { data, error, isLoading, refetch } = useQuery({ ...configQuery, staleTime: 0 });

  const fullscreen = () => {
    void ref.current?.requestFullscreen?.();
  };

  return (
    <div ref={ref} className="fixed inset-0 z-50 flex flex-col bg-night-deep">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line/60 bg-night px-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft /> {t("play.back")}
          </Link>
        </Button>
        <span className="font-display text-muted">{data?.serverName}</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={fullscreen}>
          <Maximize /> {t("play.fullscreen")}
        </Button>
      </div>
      <div className="relative flex-1">
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
        {data && <GameFrame {...data.game} />}
      </div>
    </div>
  );
}
