/** Fábrica do provedor Pix ativo, escolhido pela env `PIX_PROVIDER` (ver `apps/api/src/config.ts`). */
import type { Config } from "../config.js";
import { createFakeProvider } from "./fake.js";
import { createMercadoPagoProvider } from "./mercadopago.js";
import { createStaticProvider } from "./static.js";
import type { PixProvider } from "./types.js";

export function createPixProvider(cfg: Config): PixProvider {
  switch (cfg.PIX_PROVIDER) {
    case "static":
      return createStaticProvider({ pixKey: cfg.PIX_STATIC_KEY, merchantName: cfg.PIX_MERCHANT_NAME, merchantCity: cfg.PIX_MERCHANT_CITY, ttlMinutes: cfg.PIX_CHARGE_TTL_MIN });
    case "mercadopago":
      return createMercadoPagoProvider({ accessToken: cfg.PIX_MP_ACCESS_TOKEN, webhookSecret: cfg.PIX_MP_WEBHOOK_SECRET, payerEmail: cfg.PIX_MP_PAYER_EMAIL, ttlMinutes: cfg.PIX_CHARGE_TTL_MIN });
    case "fake":
    default:
      return createFakeProvider({ webhookSecret: cfg.PIX_FAKE_WEBHOOK_SECRET, ttlMinutes: cfg.PIX_CHARGE_TTL_MIN });
  }
}

export * from "./brcode.js";
export * from "./types.js";
