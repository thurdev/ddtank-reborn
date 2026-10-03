import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, Card, PageHeader, Skeleton } from "@ddtank/ui";
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
  { name: "expRate", label: "Taxa de EXP", type: "number", int: false, step: 0.1, min: 0, max: 100, required: true, default: 1, section: "Taxas" },
  { name: "goldRate", label: "Taxa de ouro", type: "number", int: false, step: 0.1, min: 0, max: 100, required: true, default: 1, section: "Taxas" },
  { name: "dropRate", label: "Taxa de drop", type: "number", int: false, step: 0.1, min: 0, max: 100, required: true, default: 1, section: "Taxas" },
  { name: "offerRate", label: "Taxa de mérito", type: "number", int: false, step: 0.1, min: 0, max: 100, default: 1, section: "Taxas" },
  { name: "maxPlayers", label: "Limite de jogadores online", type: "number", min: 1, default: 1000, section: "Taxas" },
  // Jogo
  { name: "aimAngles", label: "Ângulos das tabelas de mira", type: "tags", default: ["20", "30", "50", "65"], hint: "Página Jogar: ângulos (graus) mostrados nos painéis de ângulo/força — GET /api/public/aim-tables", section: "Jogo" },
  // Operação
  { name: "maintenance", label: "Modo manutenção", type: "boolean", hint: "Bloqueia novos logins de não-admins", section: "Operação" },
  { name: "maintenanceMessage", label: "Mensagem de manutenção", type: "text", section: "Operação" },
  { name: "motd", label: "Mensagem do dia (MOTD)", type: "textarea", hint: "Exibida no site e no chat do sistema ao entrar", section: "Operação" },
];

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
    </div>
  );
}
