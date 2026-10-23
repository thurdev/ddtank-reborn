import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = resolve(APP_ROOT, "..", "..");
const VENDOR = resolve(REPO_ROOT, "vendor", "DDTank41");

const bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === "boolean" ? v : ["1", "true", "yes", "on"].includes(v.toLowerCase())));

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().default(8080),
  LOG_LEVEL: z.string().default("info"),
  /** Public base URL of this API (used to build REQUEST_PATH, FLASHSITE, SITE in config.xml and the play config). */
  PUBLIC_URL: z.string().default("http://localhost:8080"),
  DATABASE_URL: z.string().optional(),
  /** Run migrations on boot. */
  DB_MIGRATE: bool.default(true),
  /** Seed the game templates on boot when game."Shop_Goods" is empty (dev convenience). */
  DB_SEED_IF_EMPTY: bool.default(true),

  JWT_SECRET: z.string().default(""),
  JWT_TTL: z.coerce.number().int().default(60 * 60 * 24 * 7),
  /** Login.ashx web key lifetime in minutes (Web.config LoginSessionTimeOut=30). */
  LOGIN_KEY_TTL_MIN: z.coerce.number().int().default(30),
  /** Lifetime of the socket password (tempPwd) after Login.ashx, minutes. */
  GAME_KEY_TTL_MIN: z.coerce.number().int().default(24 * 60),
  /** Shared secret for CreateLogin.aspx (`LoginKey`). Empty disables that legacy endpoint. */
  LOGIN_KEY: z.string().default(""),
  /** RSA private key matching the modulus compiled into the client (2.png). .NET <RSAKeyValue> XML or PEM. */
  RSA_PRIVATE_KEY: z.string().default(""),
  RSA_PRIVATE_KEY_FILE: z.string().default(""),
  /** Dev only: fall back to the (public!) key in vendor/DDTank41/Tank.Request/Web.config so the unpatched client works. */
  RSA_USE_VENDOR_KEY: bool.default(true),
  /** Tank.Request Web.config ServerID / DefaultGold / DefaultMoney / BoyVisualizeItem / GrilVisualizeItem.
   *  ch-tabela: também identifica qual linha de player."Server_List" é o canal "local" deste apps/api/apps/game
   *  (deve bater com o SERVER_ID do apps/game que fica no mesmo par) — ServerList.ts usa isso pra saber de qual
   *  canal mostrar o Online em tempo real (via GAME_INTERNAL_URL) em vez do valor gravado na linha. */
  SERVER_ID: z.coerce.number().int().default(4),
  DEFAULT_GOLD: z.coerce.number().int().default(0),
  DEFAULT_MONEY: z.coerce.number().int().default(0),
  BOY_VISUALIZE_ITEM: z.string().default("7008,3158,6103,5160,1142;3158,3107,3116,3121;6103,6102,6105,6109;5160,5112,5102,5103"),
  GIRL_VISUALIZE_ITEM: z.string().default("7008,3244,6204,5276,1214;3244,3204,3205,3206;6202,6203,6204,6205;5276,5203,5204,5205"),

  /** Compiled Flash client (Loading.swf, 2.png, ui/...). Served at /flash/. */
  FLASH_DIR: z.string().default(resolve(VENDOR, "Source Flash", "FlashSV1")),
  /** Migração 6600 (docs/plan/MIGRACAO-6600.md M1): cliente DDT-6600 servido em paralelo em /flash6600/, o 4.1
   *  continua o padrão. config.xml do 6600 fica um nível acima do pack (WebSimple/config.xml). */
  FLASH6600_DIR: z.string().default(resolve(REPO_ROOT, "vendor", "DDT-6600", "WebSimple", "Flash_6600_v040")),
  /** XMLs do Tank.Request do 6600 (snapshot do vendor): fallback de /request/*.xml que ainda não geramos (M1). */
  REQUEST6600_SNAPSHOT_DIR: z.string().default(resolve(REPO_ROOT, "vendor", "DDT-6600", "Request")),
  CONFIG6600_FILE: z.string().default(resolve(REPO_ROOT, "vendor", "DDT-6600", "WebSimple", "config.xml")),
  /** Resource pack (image/, sound/, flash/characterdefine.xml). Served at /resource/. */
  RESOURCE_DIR: z.string().default(resolve(REPO_ROOT, "vendor", "_assets", "merged")),
  /** Snapshot XML shipped with DDTank41 (static-only files with no builder). */
  REQUEST_SNAPSHOT_DIR: z.string().default(resolve(APP_ROOT, "assets", "request")),
  /** Ruffle self-hosted build (ruffle.js + wasm). Served at /ruffle/. */
  RUFFLE_DIR: z.string().default(resolve(REPO_ROOT, "apps", "client-harness", "public", "ruffle")),
  RUFFLE_URL: z.string().default(""),
  /** Cliente PixiJS (apps/client), ex.: http://localhost:5180/. Definido = o site abre ele num iframe em vez do Ruffle (só cliente 4.1). Em dev o padrão é http://localhost:5180/; "off" desliga. */
  PIXI_CLIENT_URL: z.string().default(""),

  /** Game server (apps/game) as seen by the client. */
  GAME_HOST: z.string().default("127.0.0.1"),
  GAME_PORT: z.coerce.number().int().default(9200),
  GAME_WS_URL: z.string().default("ws://localhost:9300/ws"),
  POLICY_PORT: z.coerce.number().int().default(843),
  /** apps/game internal HTTP (GET /status, GET /stats JSON). Empty disables the proxy. */
  GAME_INTERNAL_URL: z.string().default("http://127.0.0.1:9400"),
  /** apps/game ADMIN_TOKEN (Bearer) for the internal channel, if set there. */
  GAME_INTERNAL_TOKEN: z.string().optional(),

  SERVER_NAME: z.string().default("DDTank Reborn"),
  SITE_URL: z.string().default("http://localhost:5173"),
  /** config.xml USER_GUILD_ENABLE: the 4.1 newbie guide locks hall buildings behind weakless steps and needs trainer assets this pack lacks (roomlist.jpg 404 -> stuck). Off = everything open, no arrows. */
  USER_GUIDE_ENABLE: bool.default(false),
  LAUNCHER_DOWNLOAD_URL: z.string().default(""),
  LAUNCHER_UPDATE_URL: z.string().default(""),
  LAUNCHER_LATEST_VERSION: z.string().default("0.1.0"),
  LAUNCHER_MIN_VERSION: z.string().default("0.0.0"),
  CORS_ORIGINS: z.string().default("*"),

  /** Uploads: "local" (UPLOAD_DIR, served at /uploads/ and overlaid on /resource/) or "s3" (S3/R2). */
  STORAGE: z.enum(["local", "s3"]).default("local"),
  UPLOAD_DIR: z.string().default(resolve(APP_ROOT, ".data", "uploads")),
  S3_ENDPOINT: z.string().default(""),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default(""),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_PUBLIC_URL: z.string().default(""),
  MAX_UPLOAD_MB: z.coerce.number().default(50),
  /** Minutes between CelebList (ranking) rebuilds. 0 disables. */
  CELEB_REBUILD_MIN: z.coerce.number().default(10),

  // --- Pix (doação voluntária, docs/features/doacao-pix.md) ---
  /** "fake" (dev/teste, default), "static" (Pix estático, uma chave, sem webhook) ou "mercadopago" (PSP real). */
  PIX_PROVIDER: z.enum(["fake", "static", "mercadopago"]).default("fake"),
  /** Minutos até uma cobrança Pix expirar (QR/copia-e-cola). */
  PIX_CHARGE_TTL_MIN: z.coerce.number().int().default(30),
  /** Valor mínimo/máximo de uma doação, em reais (não centavos — mais legível no .env). */
  PIX_MIN_AMOUNT: z.coerce.number().default(5),
  PIX_MAX_AMOUNT: z.coerce.number().default(5000),
  /** PIX_PROVIDER=static: chave Pix do recebedor (e-mail, telefone +55DDDNUMERO, CPF/CNPJ ou chave aleatória). */
  PIX_STATIC_KEY: z.string().default(""),
  PIX_MERCHANT_NAME: z.string().default("DDTANK REBORN"),
  PIX_MERCHANT_CITY: z.string().default("BRASIL"),
  /** PIX_PROVIDER=fake: segredo do webhook de teste (header x-fake-signature). Só usado em dev/teste. */
  PIX_FAKE_WEBHOOK_SECRET: z.string().default("fake-webhook-secret"),
  /** PIX_PROVIDER=mercadopago: Access Token de produção (painel Mercado Pago > Suas integrações > Credenciais). */
  PIX_MP_ACCESS_TOKEN: z.string().default(""),
  /** PIX_PROVIDER=mercadopago: Secret key do webhook (mesma tela, aba "Webhooks"). */
  PIX_MP_WEBHOOK_SECRET: z.string().default(""),
  /** PIX_PROVIDER=mercadopago: e-mail exigido pela API de pagamentos; não coletamos e-mail do doador. */
  PIX_MP_PAYER_EMAIL: z.string().default("doacao@ddtank.local"),
});

export type Config = z.infer<typeof schema> & { rsaKeyText: string; rsaKeySource: string };

export function loadConfig(env: Record<string, string | undefined> = process.env, overrides: Partial<Config> = {}): Config {
  const parsed = schema.parse({ ...env, ...overrides });
  const c = { ...parsed, ...overrides } as Config;
  for (const k of ["FLASH_DIR", "FLASH6600_DIR", "CONFIG6600_FILE", "REQUEST6600_SNAPSHOT_DIR", "RESOURCE_DIR", "REQUEST_SNAPSHOT_DIR", "RUFFLE_DIR", "UPLOAD_DIR"] as const) {
    const v = c[k];
    if (v && !isAbsolute(v)) c[k] = resolve(APP_ROOT, v);
  }
  c.PUBLIC_URL = c.PUBLIC_URL.replace(/\/+$/, "");
  if (!c.JWT_SECRET) {
    if (c.NODE_ENV === "production") throw new Error("JWT_SECRET is required in production");
    c.JWT_SECRET = "dev-insecure-jwt-secret-change-me";
  }
  // RSA key: env text > file > (dev) vendor Web.config
  c.rsaKeyText = c.RSA_PRIVATE_KEY;
  c.rsaKeySource = "RSA_PRIVATE_KEY";
  if (!c.rsaKeyText && c.RSA_PRIVATE_KEY_FILE) {
    c.rsaKeyText = readFileSync(resolve(APP_ROOT, c.RSA_PRIVATE_KEY_FILE), "utf8");
    c.rsaKeySource = c.RSA_PRIVATE_KEY_FILE;
  }
  // dev: a página Jogar abre o cliente PixiJS (apps/client, `pnpm --filter @ddt/client dev`) por padrão;
  // PIXI_CLIENT_URL=off volta pro Ruffle
  if (!c.PIXI_CLIENT_URL && c.NODE_ENV === "development") c.PIXI_CLIENT_URL = "http://localhost:5180/";
  if (c.PIXI_CLIENT_URL === "off") c.PIXI_CLIENT_URL = "";
  if (!c.rsaKeyText && c.RSA_USE_VENDOR_KEY && c.NODE_ENV !== "production") {
    const wc = resolve(VENDOR, "Tank.Request", "Web.config");
    if (existsSync(wc)) {
      const m = /key="privateKey"\s+value="([^"]+)"/.exec(readFileSync(wc, "utf8"));
      if (m) {
        c.rsaKeyText = m[1]!.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
        c.rsaKeySource = "vendor Web.config (public key pair, dev only)";
      }
    }
  }
  return c;
}
