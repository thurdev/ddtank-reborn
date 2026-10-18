import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, Badge, Button, Card, PageHeader, Skeleton } from "@ddtank/ui";
import { Download } from "lucide-react";
import { api } from "@/lib/api";
import { SchemaForm } from "@/crud/SchemaForm";
import { ResourcePage } from "@/crud/ResourcePage";
import type { FieldDef, Row } from "@/crud/types";
import { donations } from "@/resources";
import { useI18n } from "@/i18n";

interface DonationSettingsApi {
  enabled: boolean;
  provider: string;
  goalCents: number;
  minAmountCents: number;
  maxAmountCents: number;
  monthlyCostCents: number;
}

/** Centavos <-> reais só na borda desta página (a API fala sempre em centavos). */
const toReais = (s: DonationSettingsApi): Row => ({ enabled: s.enabled, provider: s.provider, goal: s.goalCents / 100, minAmount: s.minAmountCents / 100, maxAmount: s.maxAmountCents / 100, monthlyCost: s.monthlyCostCents / 100 });
const toCents = (r: Row): Partial<DonationSettingsApi> => ({
  enabled: !!r.enabled,
  goalCents: Math.round(Number(r.goal) * 100),
  minAmountCents: Math.round(Number(r.minAmount) * 100),
  maxAmountCents: Math.round(Number(r.maxAmount) * 100),
  monthlyCostCents: Math.round(Number(r.monthlyCost || 0) * 100),
});

const settingsFields: FieldDef[] = [
  { name: "enabled", label: { "pt-BR": "Doações ativas", en: "Donations enabled" }, type: "boolean", hint: { "pt-BR": "Desativado: a página \"Apoiar\" para de aceitar novas doações.", en: "Disabled: the \"Support\" page stops accepting new donations." } },
  { name: "provider", label: { "pt-BR": "Provedor ativo", en: "Active provider" }, type: "text", readOnly: true, hint: { "pt-BR": "Definido por PIX_PROVIDER no .env do servidor — não muda por aqui.", en: "Set by PIX_PROVIDER in the server's .env — not changed from here." } },
  { name: "goal", label: { "pt-BR": "Meta do mês (R$)", en: "Monthly goal (R$)" }, type: "number", int: false, min: 0, step: 1, section: "Metas e limites" },
  { name: "minAmount", label: { "pt-BR": "Valor mínimo (R$)", en: "Minimum amount (R$)" }, type: "number", int: false, min: 0.01, step: 1, required: true, section: "Metas e limites" },
  { name: "maxAmount", label: { "pt-BR": "Valor máximo (R$)", en: "Maximum amount (R$)" }, type: "number", int: false, min: 0.01, step: 1, required: true, section: "Metas e limites" },
  {
    name: "monthlyCost",
    label: { "pt-BR": "Custo mensal do servidor (R$)", en: "Monthly server cost (R$)" },
    type: "number",
    int: false,
    min: 0,
    step: 1,
    default: 0,
    hint: { "pt-BR": "Opcional. Hospedagem + domínio etc. — mostrado na página pública /transparencia. 0 = esconde o comparativo.", en: "Optional. Hosting + domain etc. — shown on the public /transparencia page. 0 = hides the comparison." },
    section: "Transparência",
  },
];

function downloadCsv(status: string, provider: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (provider) params.set("provider", provider);
  const url = `/api/admin/donations/export${params.size ? `?${params}` : ""}`;
  const token = api.getToken();
  fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} })
    .then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `doacoes-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(() => toast.error("Não foi possível exportar o CSV"));
}

export function DonationsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "donation-settings"], queryFn: () => api.get<DonationSettingsApi>("/api/admin/donation-settings") });
  const save = useMutation({
    mutationFn: (body: Row) => api.put<DonationSettingsApi>("/api/admin/donation-settings", toCents(body)),
    onSuccess: (res) => qc.setQueryData(["admin", "donation-settings"], res),
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="max-w-3xl">
        <PageHeader title={t("donations.title")} description={t("donations.lead")} />
        <Card className="p-6">
          {isLoading ? (
            <Skeleton className="h-72" />
          ) : (
            <SchemaForm
              fields={settingsFields}
              mode="edit"
              initial={data && toReais(data)}
              onSubmit={async (body) => {
                try {
                  await save.mutateAsync(body);
                  toast.success(t("donations.settingsSaved"));
                } catch (e) {
                  toast.error(e instanceof ApiError ? e.message : t("common.error"));
                }
              }}
            />
          )}
        </Card>
      </div>
      <section>
        <h2 className="title-plate mb-2 text-2xl">{t("donations.list")}</h2>
        <ResourcePage
          def={donations}
          embedded
          headerActions={
            <Button variant="secondary" onClick={() => downloadCsv("", "")}>
              <Download /> {t("donations.exportCsv")}
            </Button>
          }
        />
      </section>
      <p className="text-xs text-muted">
        <Badge tone="mint" className="mr-2">
          {t("donations.noP2wBadge")}
        </Badge>
        {t("donations.noP2wBody")}
      </p>
    </div>
  );
}
