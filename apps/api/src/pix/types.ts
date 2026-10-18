/**
 * Doação via Pix (docs/features/doacao-pix.md): interface comum entre os provedores. Regra inegociável do
 * projeto (README "Apoiar"): uma doação NUNCA dá vantagem de jogo — este módulo só fala com `apps/api`
 * (cobrança, webhook, conciliação), nunca com `apps/game`.
 *
 * Provedores implementados (`apps/api/src/pix/index.ts` escolhe pela env `PIX_PROVIDER`):
 *  - "fake"  (`fake.ts`)   — dev/teste, sem rede. Default quando nada está configurado.
 *  - "static" (`static.ts`) — Pix estático (chave Pix local, sem PSP/webhook); admin confirma manualmente.
 *  - "mercadopago" (`mercadopago.ts`) — PSP real (cobrança Pix imediata + webhook), ver docs pra habilitar.
 */

/** Cobrança Pix recém-criada, devolvida por `POST /api/donations`. */
export interface PixCharge {
  /** Nosso identificador (gerado antes de chamar o provedor), usado pra correlacionar o webhook. */
  txid: string;
  /** Pix "copia e cola" (payload EMV, BACEN manual "Arranjo Pix" seção QR Code). */
  brCode: string;
  /** PNG do QR code, em base64 (sem o prefixo "data:image/png;base64,"). */
  qrCodePngBase64: string;
  /** Validade da cobrança (provedores reais expiram; "fake"/"static" usam um valor de config). */
  expiresAt: Date;
  /** Id da cobrança do lado do PSP (ex. payment id do Mercado Pago). Ausente em "fake"/"static". */
  providerChargeId?: string;
}

export type PixWebhookStatus = "paid" | "expired" | "pending" | "unknown";

/** Resultado de interpretar uma notificação de webhook do provedor. */
export interface PixWebhookResult {
  /** Nosso txid, se o provedor conseguiu correlacionar (ex. via external_reference). Null = não identificado. */
  txid: string | null;
  status: PixWebhookStatus;
  providerChargeId?: string;
}

export interface CreateChargeInput {
  /** Nosso txid, já gerado (o provedor real deve ecoar como external_reference/txid pra correlacionar o webhook). */
  txid: string;
  amountCents: number;
  /** Descrição curta da cobrança (aparece no extrato Pix do doador, quando o PSP suportar). */
  description: string;
  /** Nome do doador, se informado (nunca CPF/dado bancário). */
  payerName?: string;
}

/** Requisição de webhook, abstraída do framework HTTP (Fastify) pra facilitar teste. */
export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  /** Corpo já desserializado (JSON) quando disponível. */
  body: unknown;
  /** Corpo bruto (string), necessário pra verificar assinatura HMAC byte-a-byte. */
  rawBody: string;
  /** Query string (ex. Mercado Pago manda `?data.id=...&type=payment` além do corpo). */
  query?: Record<string, string>;
}

export interface PixProvider {
  name: string;
  /** Falso para "static" (sem webhook real: confirmação é manual no admin). */
  supportsWebhook: boolean;
  createCharge(input: CreateChargeInput): Promise<PixCharge>;
  /** Verifica a assinatura do webhook. Provedores sem webhook (ex. "static") sempre retornam false. */
  verifyWebhookSignature(req: WebhookRequest): boolean;
  /** Interpreta o corpo do webhook (já com assinatura verificada) em {txid, status}. */
  parseWebhook(req: WebhookRequest): Promise<PixWebhookResult>;
}
