/**
 * Provedor "fake": sem rede, sem PSP — usado em dev/teste e quando nenhum provedor real está configurado
 * (default, ver `index.ts`). Gera um BR Code de aparência real (mesmo gerador EMV do provedor "static",
 * `brcode.ts`) pra exercitar a tela "Apoiar" do site de ponta a ponta sem precisar de credenciais.
 *
 * Confirmação de pagamento: não existe um banco de verdade do outro lado, então a "confirmação" é sempre
 * manual — o admin (ou um teste) chama `POST /api/admin/donations/:id/mark-paid`, que marca o status
 * direto no banco (não passa pelo webhook). O webhook deste provedor existe só pra exercitar o fluxo de
 * assinatura/idempotência em teste (`POST /api/pix/webhook` com header `x-fake-signature`), não é chamado
 * por nenhum PSP real.
 */
import QRCode from "qrcode";
import { buildBrCode } from "./brcode.js";
import type { CreateChargeInput, PixCharge, PixProvider, PixWebhookResult, WebhookRequest } from "./types.js";

export interface FakeProviderConfig {
  /** Segredo compartilhado pro webhook de teste (header `x-fake-signature`). */
  webhookSecret: string;
  /** Minutos até expirar a cobrança fake. */
  ttlMinutes: number;
}

interface FakeWebhookBody {
  txid?: string;
  status?: "paid" | "expired";
}

export function createFakeProvider(cfg: FakeProviderConfig): PixProvider {
  return {
    name: "fake",
    supportsWebhook: true,

    async createCharge(input: CreateChargeInput): Promise<PixCharge> {
      const brCode = buildBrCode({
        pixKey: "doacao-fake@ddtank.local",
        merchantName: "DDTANK REBORN",
        merchantCity: "BRASIL",
        amountCents: input.amountCents,
        txid: input.txid,
        description: input.description,
      });
      const qrCodePngBase64 = (await QRCode.toDataURL(brCode, { type: "image/png", margin: 1 })).replace(/^data:image\/png;base64,/, "");
      return { txid: input.txid, brCode, qrCodePngBase64, expiresAt: new Date(Date.now() + cfg.ttlMinutes * 60_000) };
    },

    verifyWebhookSignature(req: WebhookRequest): boolean {
      const sig = req.headers["x-fake-signature"];
      return typeof sig === "string" && sig === cfg.webhookSecret;
    },

    async parseWebhook(req: WebhookRequest): Promise<PixWebhookResult> {
      const b = (typeof req.body === "object" && req.body ? req.body : {}) as FakeWebhookBody;
      if (!b.txid) return { txid: null, status: "unknown" };
      return { txid: b.txid, status: b.status === "paid" || b.status === "expired" ? b.status : "unknown" };
    },
  };
}
