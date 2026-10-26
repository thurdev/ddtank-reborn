import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, Button, Card, Input, PageHeader, Skeleton } from "@ddtank/ui";
import { api } from "@/lib/api";
import { SchemaForm } from "@/crud/SchemaForm";
import type { FieldDef, Row } from "@/crud/types";
import { useI18n } from "@/i18n";

const HOST = /^[A-Za-z0-9.-]+$/;
const URL_RE = /^(https?|wss?):\/\/\S+$/;

/** Every network/gameplay setting exposed by GET/PUT /api/admin/server-config. */
export const serverConfigFields: FieldDef[] = [
  // Rede
  { name: "publicHost", label: "Host público", type: "text", required: true, pattern: HOST, patternMessage: "Use um domínio ou IP", hint: "Domínio ou IP que o cliente usa para conectar", section: "Rede" },
  { name: "publicIps", label: "IPs públicos", type: "tags", hint: "IPs anunciados pelo servidor (lista de servidores do cliente)", section: "Rede" },
  { name: "tcpPort", label: "Porta TCP do jogo", type: "number", required: true, min: 1, max: 65535, default: 9200, section: "Rede" },
  { name: "wsUrl", label: "URL WebSocket", type: "text", required: true, pattern: URL_RE, patternMessage: "Use ws:// ou wss://", placeholder: "wss://jogo.exemplo.com/ws/game", hint: "Usada pelo Ruffle (socketProxy) no navegador", section: "Rede" },
  { name: "policyPort", label: "Porta do policy server", type: "number", required: true, min: 1, max: 65535, default: 843, hint: "crossdomain policy do Flash (padrão 843)", section: "Rede" },
  { name: "resourceUrl", label: "URL de recursos (CDN)", type: "text", required: true, pattern: URL_RE, patternMessage: "URL inválida", placeholder: "https://cdn.exemplo.com/resource/", hint: "Base de imagens, SWFs e sons do cliente", section: "Endereços do cliente" },
  { name: "requestUrl", label: "URL de requisições", type: "text", required: true, pattern: URL_RE, patternMessage: "URL inválida", placeholder: "https://api.exemplo.com/", hint: "Base das chamadas .ashx (Tank.Request)", section: "Endereços do cliente" },
  { name: "flashUrl", label: "URL do cliente (SWF)", type: "text", pattern: URL_RE, patternMessage: "URL inválida", placeholder: "https://cdn.exemplo.com/flash/", section: "Endereços do cliente" },
  // Taxas
  { name: "expRate", label: "Taxa de EXP", type: "number", int: false, step: 0.1, min: 0, max: 100, required: true, default: 1, hint: "Multiplica a EXP de toda partida; acumula com o evento \"EXP em dobro\" quando ativo. Aplicado ao vivo (sem reiniciar o servidor).", section: "Taxas" },
  { name: "goldRate", label: "Taxa de ouro", type: "number", int: false, step: 0.1, min: 0, max: 100, required: true, default: 1, hint: "Multiplica o ouro de drop; acumula com o evento \"Ouro em dobro\" quando ativo. Aplicado ao vivo (sem reiniciar o servidor).", section: "Taxas" },
  { name: "dropRate", label: "Taxa de drop", type: "number", int: false, step: 0.1, min: 0, max: 100, required: true, default: 1, hint: "Multiplica a quantidade dos itens de drop do PvE (por cima das tabelas de Drop_Item/NPC e do balanço por instância). Aplicado ao vivo.", section: "Taxas" },
  { name: "offerRate", label: "Taxa de mérito", type: "number", int: false, step: 0.1, min: 0, max: 100, default: 1, hint: "Multiplica o mérito de guilda ganho na guerra de sociedade (RateMgr Offer_Rate do original). Aplicado ao vivo.", section: "Taxas" },
  { name: "maxPlayers", label: "Limite de jogadores online", type: "number", min: 1, default: 1000, section: "Taxas" },
  // Jogo
  { name: "aimAngles", label: "Ângulos das tabelas de mira", type: "tags", default: ["20", "30", "50", "65"], hint: "Página Jogar: ângulos (graus) mostrados nos painéis de ângulo/força — GET /api/public/aim-tables", section: "Jogo" },
  // Operação
  { name: "maintenance", label: "Modo manutenção", type: "boolean", hint: "Bloqueia novos logins de não-admins", section: "Operação" },
  { name: "maintenanceMessage", label: "Mensagem de manutenção", type: "text", section: "Operação" },
  { name: "motd", label: "Mensagem do dia (MOTD)", type: "textarea", hint: "Exibida no site e no chat do sistema ao entrar", section: "Operação" },
];

/**
 * 41-hot-update: "Aplicar agora" — reloada templates/loja/eventos/config no apps/game E empurra pros
 * jogadores JÁ CONECTADOS os pacotes que o cliente 4.1/6600 sabe processar sem relogar (POST
 * /api/admin/hot-update, docs/features/hot-update.md tem o mapa completo do que atualiza ao vivo vs o que
 * precisa relogar). Sem campo de "kinds" aqui — o botão sempre aplica tudo que o módulo sabe empurrar; só o
 * aviso (notice) é opcional.
 */
function HotUpdateCard() {
  const { t } = useI18n();
  const [notice, setNotice] = useState("");
  const apply = useMutation({
    mutationFn: () => api.post<{ notified: number }>("/api/admin/hot-update", { notice: notice.trim() || undefined }),
    onSuccess: (res) => {
      toast.success(t("config.hotUpdate.done", { count: res.notified }));
      setNotice("");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.error")),
  });

  return (
    <Card className="p-6 mt-6">
      <h2 className="font-semibold text-lg">{t("config.hotUpdate.title")}</h2>
      <p className="text-sm text-muted-foreground mt-1">{t("config.hotUpdate.lead")}</p>
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <Input
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder={t("config.hotUpdate.noticePlaceholder")}
          maxLength={1000}
          className="flex-1"
          aria-label={t("config.hotUpdate.noticePlaceholder")}
        />
        <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
          {apply.isPending ? t("common.saving") : t("config.hotUpdate.apply")}
        </Button>
      </div>
    </Card>
  );
}

export function ServerConfigPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "server-config"], queryFn: () => api.get<Row>("/api/admin/server-config") });
  const save = useMutation({
    mutationFn: (body: Row) => api.put<Row>("/api/admin/server-config", body),
    onSuccess: (res) => qc.setQueryData(["admin", "server-config"], res),
  });

  return (
    <div className="max-w-4xl">
      <PageHeader title={t("config.title")} description={t("config.lead")} />
      <Card className="p-6">
        {isLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <SchemaForm
            fields={serverConfigFields}
            mode="edit"
            initial={data}
            onSubmit={async (body) => {
              try {
                await save.mutateAsync(body);
                toast.success(t("config.saved"));
              } catch (e) {
                toast.error(e instanceof ApiError ? e.message : t("common.error"));
              }
            }}
          />
        )}
      </Card>
      <HotUpdateCard />
    </div>
  );
}
