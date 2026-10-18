import { CheckCircle2, HeartHandshake } from "lucide-react";
import { defineResource, type Row } from "@/crud/types";

/** Centavos -> "R$ 12,34". */
function BRL(v: unknown) {
  return <span className="font-mono tabular-nums">{(Number(v) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>;
}

const STATUS_OPTIONS = [
  { value: "pending", label: { "pt-BR": "Pendente", en: "Pending" }, tone: "sun" as const },
  { value: "paid", label: { "pt-BR": "Pago", en: "Paid" }, tone: "mint" as const },
  { value: "expired", label: { "pt-BR": "Expirado", en: "Expired" }, tone: "neutral" as const },
  { value: "canceled", label: { "pt-BR": "Cancelado", en: "Canceled" }, tone: "coral" as const },
];

const PROVIDER_OPTIONS = [
  { value: "fake", label: { "pt-BR": "Fake (teste)", en: "Fake (test)" } },
  { value: "static", label: { "pt-BR": "Pix estático", en: "Static Pix" } },
  { value: "mercadopago", label: { "pt-BR": "Mercado Pago", en: "Mercado Pago" } },
];

/**
 * pix-admin (docs/features/doacao-pix.md): lista/conciliação de doações. Criação é só pelo fluxo público
 * (`POST /api/donations`) — aqui é leitura + "marcar como pago" (fake/static) + exportar CSV. O status nunca
 * é editável direto no formulário (`form: false`): a única forma de mudar é a ação "Marcar como pago" (que o
 * backend restringe a `fake`/`static`) ou o webhook do PSP real.
 */
export const donations = defineResource({
  name: "donations",
  table: 'app."Donations"',
  label: { "pt-BR": "Doações", en: "Donations" },
  singular: { "pt-BR": "doação", en: "donation" },
  description: "Doações via Pix: conciliação, marcar pago (fake/static) e exportar CSV. Nunca dá vantagem de jogo.",
  icon: HeartHandshake,
  group: "site",
  hidden: true, // exibida pela página custom /donations (Settings + export + esta lista embutida)
  idField: "id",
  titleField: "payerName",
  defaultSort: "-createdAt",
  // Nada é editável direto no formulário (todo campo é `form: false`) — só a ação "Marcar como pago" e o
  // webhook do PSP real mudam o status. Delete fica disponível (remover doações fake/teste/spam).
  capabilities: { create: false, update: false },
  filters: [
    { name: "status", label: { "pt-BR": "Status", en: "Status" }, type: "select", options: [{ value: "", label: { "pt-BR": "Todos", en: "All" } }, ...STATUS_OPTIONS] },
    { name: "provider", label: { "pt-BR": "Provedor", en: "Provider" }, type: "select", options: [{ value: "", label: { "pt-BR": "Todos", en: "All" } }, ...PROVIDER_OPTIONS] },
  ],
  rowActions: [
    {
      id: "mark-paid",
      label: { "pt-BR": "Marcar como pago", en: "Mark as paid" },
      icon: CheckCircle2,
      tone: "success",
      path: "mark-paid",
      confirm: { "pt-BR": "Confirma que o Pix caiu na conta e quer marcar esta doação como paga?", en: "Confirm the Pix landed in the account and mark this donation as paid?" },
      success: { "pt-BR": "Doação marcada como paga", en: "Donation marked as paid" },
      visible: (row: Row) => row.status === "pending" && (row.provider === "fake" || row.provider === "static"),
    },
  ],
  fields: [
    { name: "id", label: "ID", type: "number", list: true, sortable: true, form: false },
    { name: "createdAt", label: { "pt-BR": "Criada em", en: "Created" }, type: "datetime", list: true, sortable: true, form: false },
    { name: "amountCents", label: { "pt-BR": "Valor", en: "Amount" }, type: "number", list: true, sortable: true, form: false, render: (v) => BRL(v) },
    { name: "status", label: { "pt-BR": "Status", en: "Status" }, type: "select", options: STATUS_OPTIONS, list: true, form: false },
    { name: "provider", label: { "pt-BR": "Provedor", en: "Provider" }, type: "select", options: PROVIDER_OPTIONS, list: true, form: false },
    { name: "payerName", label: { "pt-BR": "Doador", en: "Donor" }, type: "text", list: true, form: false },
    { name: "message", label: { "pt-BR": "Mensagem", en: "Message" }, type: "textarea", form: false },
    { name: "optIn", label: { "pt-BR": "Exibir no site", en: "Shown on site" }, type: "boolean", list: true, form: false },
    { name: "txid", label: "txid", type: "text", form: false },
    { name: "providerChargeId", label: { "pt-BR": "Id no PSP", en: "PSP charge id" }, type: "text", form: false },
    { name: "accountId", label: { "pt-BR": "Conta (site)", en: "Account (site)" }, type: "number", form: false },
    { name: "paidAt", label: { "pt-BR": "Pago em", en: "Paid at" }, type: "datetime", list: true, sortable: true, form: false },
    { name: "expiresAt", label: { "pt-BR": "Expira em", en: "Expires at" }, type: "datetime", form: false },
  ],
});
