import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, Card, PageHeader } from "@ddtank/ui";
import { api } from "@/lib/api";
import { SchemaForm } from "@/crud/SchemaForm";
import { ResourcePage } from "@/crud/ResourcePage";
import type { FieldDef, Row } from "@/crud/types";
import { mailBroadcasts } from "@/resources";
import { useI18n } from "@/i18n";

const mailFields: FieldDef[] = [
  {
    name: "target",
    label: "Destinatários",
    type: "select",
    required: true,
    options: [
      { value: "all", label: "Todos os jogadores" },
      { value: "online", label: "Somente online" },
      { value: "level", label: "Por faixa de nível" },
      { value: "list", label: "Lista de apelidos" },
    ],
    section: "Destino",
  },
  { name: "levelMin", label: "Nível mín.", type: "number", min: 1, max: 100, hint: "Usado com 'Por faixa de nível'", section: "Destino" },
  { name: "levelMax", label: "Nível máx.", type: "number", min: 1, max: 100, section: "Destino" },
  { name: "nicknames", label: "Apelidos", type: "tags", hint: "Usado com 'Lista de apelidos'", section: "Destino" },
  { name: "subject", label: "Assunto", type: "text", required: true, maxLength: 50, span: 2, section: "Carta" },
  { name: "body", label: "Mensagem", type: "textarea", required: true, maxLength: 500, section: "Carta" },
  { name: "gold", label: "Ouro", type: "number", min: 0, default: 0, section: "Anexos" },
  { name: "money", label: "Cupons", type: "number", min: 0, default: 0, section: "Anexos" },
  { name: "giftToken", label: "Medalhas", type: "number", min: 0, default: 0, section: "Anexos" },
  {
    name: "items",
    label: "Itens",
    type: "json",
    default: [],
    hint: 'Até 5: [{"templateId": 11020, "count": 1, "validDays": 0}]',
    section: "Anexos",
  },
];

export function MailPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const send = useMutation({
    mutationFn: (body: Row) => api.post<{ recipients: number }>("/api/admin/mail/broadcast", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resource", mailBroadcasts.name] }),
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="max-w-4xl">
        <PageHeader title={t("mail.title")} description={t("mail.lead")} />
        <Card className="p-6">
          <SchemaForm
            fields={mailFields}
            submitLabel={t("mail.send")}
            onSubmit={async (body) => {
              try {
                const res = await send.mutateAsync(body);
                toast.success(t("mail.sent", { n: res.recipients }));
              } catch (e) {
                toast.error(e instanceof ApiError ? e.message : t("common.error"));
              }
            }}
          />
        </Card>
      </div>
      <section>
        <h2 className="title-plate mb-2 text-2xl">{t("mail.history")}</h2>
        <ResourcePage def={mailBroadcasts} embedded />
      </section>
    </div>
  );
}
