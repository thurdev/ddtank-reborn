/**
 * Provedor real: Mercado Pago (Pix imediato + webhook). Escolhido entre Efí/Gerencianet, Mercado Pago e Asaas
 * por ter a API REST mais simples pra cobrança Pix imediata — só Bearer token (sem mTLS/certificado, que o
 * Efí exige) e webhook com assinatura HMAC documentada. Trade-offs dos outros dois: docs/features/doacao-pix.md.
 *
 * NUNCA chamado em teste (sem rede nos testes, ver AGENTS.md) — revisar com cuidado antes de habilitar em
 * produção. Habilitar: `PIX_PROVIDER=mercadopago` + `PIX_MP_ACCESS_TOKEN` (Access Token de produção, painel
 * Mercado Pago > Suas integrações > credenciais) + `PIX_MP_WEBHOOK_SECRET` (mesma tela, "Webhooks > Secret
 * key") + configurar a URL do webhook no painel: `{PUBLIC_URL}/api/pix/webhook`.
 *
 * Docs oficiais: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-methods/pix
 * Webhook/assinatura: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { CreateChargeInput, PixCharge, PixProvider, PixWebhookResult, WebhookRequest } from "./types.js";

export interface MercadoPagoConfig {
  accessToken: string;
  webhookSecret: string;
  /** E-mail do pagador exigido pela API de pagamentos do MP; não coletamos e-mail do doador (minimizar dado
   *  pessoal guardado), então usamos um e-mail genérico institucional em todas as cobranças Pix. */
  payerEmail: string;
  /** Minutos até a cobrança expirar (MP `date_of_expiration`). */
  ttlMinutes: number;
  apiBase?: string;
}

interface MpPaymentResponse {
  id: number | string;
  status: string;
  external_reference?: string;
  date_of_expiration?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
}

const MP_STATUS: Record<string, PixWebhookResult["status"]> = {
  approved: "paid",
  cancelled: "expired",
  rejected: "expired",
  pending: "pending",
  in_process: "pending",
};

export function createMercadoPagoProvider(cfg: MercadoPagoConfig): PixProvider {
  if (!cfg.accessToken) throw new Error('PIX_PROVIDER="mercadopago" exige PIX_MP_ACCESS_TOKEN em .env');
  const base = (cfg.apiBase ?? "https://api.mercadopago.com").replace(/\/+$/, "");

  return {
    name: "mercadopago",
    supportsWebhook: true,

    async createCharge(input: CreateChargeInput): Promise<PixCharge> {
      const expiresAt = new Date(Date.now() + cfg.ttlMinutes * 60_000);
      const res = await fetch(`${base}/v1/payments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${cfg.accessToken}`,
          "x-idempotency-key": input.txid,
        },
        body: JSON.stringify({
          transaction_amount: Math.round(input.amountCents) / 100,
          description: input.description,
          payment_method_id: "pix",
          external_reference: input.txid,
          date_of_expiration: expiresAt.toISOString(),
          payer: { email: cfg.payerEmail },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`mercadopago: falha ao criar cobrança Pix (HTTP ${res.status}): ${await res.text()}`);
      const data = (await res.json()) as MpPaymentResponse;
      const td = data.point_of_interaction?.transaction_data;
      if (!td?.qr_code || !td.qr_code_base64) throw new Error("mercadopago: resposta sem qr_code/qr_code_base64");
      return {
        txid: input.txid,
        brCode: td.qr_code,
        qrCodePngBase64: td.qr_code_base64,
        expiresAt: data.date_of_expiration ? new Date(data.date_of_expiration) : expiresAt,
        providerChargeId: String(data.id),
      };
    },

    /**
     * Assinatura do webhook (https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks):
     * header `x-signature: ts=<unix>,v1=<hex>` é o HMAC-SHA256 do manifest
     * `id:{data.id};request-id:{x-request-id};ts:{ts};` (data.id em minúsculas), com `PIX_MP_WEBHOOK_SECRET`.
     */
    verifyWebhookSignature(req: WebhookRequest): boolean {
      const sigHeader = req.headers["x-signature"];
      const requestId = req.headers["x-request-id"];
      if (typeof sigHeader !== "string" || typeof requestId !== "string") return false;
      const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
      const ts = parts.ts;
      const v1 = parts.v1;
      if (!ts || !v1) return false;
      const dataId = dataIdOf(req);
      if (!dataId) return false;
      const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
      const expected = createHmac("sha256", cfg.webhookSecret).update(manifest).digest("hex");
      const a = Buffer.from(expected, "hex");
      const b = Buffer.from(v1, "hex");
      return a.length === b.length && timingSafeEqual(a, b);
    },

    /**
     * A notificação em si só traz o id do pagamento (`data.id`) — precisa buscar o pagamento pra saber o
     * status e o `external_reference` (nosso txid), que foi setado em `createCharge`.
     */
    async parseWebhook(req: WebhookRequest): Promise<PixWebhookResult> {
      const id = dataIdOf(req);
      if (!id) return { txid: null, status: "unknown" };
      const res = await fetch(`${base}/v1/payments/${id}`, {
        headers: { authorization: `Bearer ${cfg.accessToken}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return { txid: null, status: "unknown" };
      const data = (await res.json()) as MpPaymentResponse;
      return { txid: data.external_reference ?? null, status: MP_STATUS[data.status] ?? "unknown", providerChargeId: String(data.id) };
    },
  };
}

/** `data.id` pode vir no corpo (`{type:"payment", data:{id}}`) ou na query string (`?data.id=...&type=payment`). */
function dataIdOf(req: WebhookRequest): string | null {
  const b = req.body as { data?: { id?: string | number } } | undefined;
  if (b?.data?.id !== undefined) return String(b.data.id);
  const fromQuery = req.query?.["data.id"];
  return fromQuery ?? null;
}
