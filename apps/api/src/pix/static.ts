/**
 * Provedor "static" — Pix estático: BR Code gerado localmente a partir de UMA chave Pix (e-mail, telefone,
 * CPF/CNPJ ou chave aleatória) cadastrada em `.env`, sem nenhum PSP e sem webhook. Cada doação ainda recebe
 * um valor e um txid próprios (então o BR Code muda por doação — "estático" aqui é "sem PSP", não "código
 * fixo pra sempre"), mas como não existe nenhuma API pra avisar o recebimento, a confirmação é 100% manual:
 * o próprio dono do servidor olha o extrato do Pix (app do banco) e marca a doação como paga no admin
 * (`POST /api/admin/donations/:id/mark-paid`). Documentado em docs/features/doacao-pix.md.
 */
import { buildBrCode } from "./brcode.js";
import type { CreateChargeInput, PixCharge, PixProvider, PixWebhookResult, WebhookRequest } from "./types.js";
import QRCode from "qrcode";

export interface StaticProviderConfig {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  ttlMinutes: number;
}

export function createStaticProvider(cfg: StaticProviderConfig): PixProvider {
  if (!cfg.pixKey) throw new Error('PIX_PROVIDER="static" exige PIX_STATIC_KEY (chave Pix do recebedor) em .env');
  return {
    name: "static",
    supportsWebhook: false,

    async createCharge(input: CreateChargeInput): Promise<PixCharge> {
      const brCode = buildBrCode({
        pixKey: cfg.pixKey,
        merchantName: cfg.merchantName,
        merchantCity: cfg.merchantCity,
        amountCents: input.amountCents,
        txid: input.txid,
        description: input.description,
      });
      const qrCodePngBase64 = (await QRCode.toDataURL(brCode, { type: "image/png", margin: 1 })).replace(/^data:image\/png;base64,/, "");
      return { txid: input.txid, brCode, qrCodePngBase64, expiresAt: new Date(Date.now() + cfg.ttlMinutes * 60_000) };
    },

    // Sem webhook: o PSP aqui é "nenhum", ninguém assina nada. Confirmação é manual no admin.
    verifyWebhookSignature(_req: WebhookRequest): boolean {
      return false;
    },
    async parseWebhook(_req: WebhookRequest): Promise<PixWebhookResult> {
      return { txid: null, status: "unknown" };
    },
  };
}
