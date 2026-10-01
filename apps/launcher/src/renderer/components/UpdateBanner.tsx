import { Download, RefreshCw } from "lucide-react";
import { Button } from "@ddtank/ui";
import type { UpdateState } from "../../shared/types";

export function UpdateBanner({ update, blocked, downloadUrl }: { update?: UpdateState; blocked: boolean; downloadUrl?: string }) {
  if (blocked) {
    return (
      <Bar tone="bg-coral text-white">
        Esta versão do launcher não é mais aceita pelo servidor. Atualize para continuar jogando.
        {downloadUrl && (
          <Button size="sm" variant="secondary" onClick={() => window.launcher.openExternal(downloadUrl)}>
            <Download /> Baixar nova versão
          </Button>
        )}
      </Bar>
    );
  }
  if (!update) return null;
  switch (update.state) {
    case "available":
      return (
        <Bar tone="bg-sky text-night-deep">
          Nova versão {update.version} disponível.
          {update.manual ? (
            update.downloadUrl && (
              <Button size="sm" variant="secondary" onClick={() => window.launcher.openExternal(update.downloadUrl!)}>
                <Download /> Baixar
              </Button>
            )
          ) : (
            <span className="text-sm">Baixando em segundo plano…</span>
          )}
        </Bar>
      );
    case "downloading":
      return <Bar tone="bg-sky text-night-deep">Baixando atualização… {update.percent}%</Bar>;
    case "ready":
      return (
        <Bar tone="bg-mint text-night-deep">
          Atualização {update.version} pronta.
          <Button size="sm" variant="secondary" onClick={() => window.launcher.installUpdate()}>
            <RefreshCw /> Reiniciar e instalar
          </Button>
        </Bar>
      );
    default:
      return null;
  }
}

function Bar({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <div className={`flex items-center gap-3 px-6 py-2 text-sm font-medium ${tone}`}>{children}</div>;
}
