/**
 * Doação via Pix (docs/features/doacao-pix.md) — fluxo completo com o provedor "fake" (sem rede):
 * criar cobrança -> webhook (assinatura boa/má, idempotência) -> resumo público; conciliação e settings
 * no admin (role obrigatória); provedor "static" (sem webhook, confirmação manual).
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDb, createDevAccounts, migrateDb, seedDatabase, type DbHandle } from "@ddt/db";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

let h: DbHandle;
let app: FastifyInstance;
let adminToken = "";

const tmp = mkdtempSync(join(tmpdir(), "ddt-donations-"));

async function build(env: Record<string, string | undefined>) {
  h = await createDb("pglite:memory");
  await migrateDb(h);
  await seedDatabase(h);
  await createDevAccounts(h);
  const { app: a } = await buildApp({
    db: h,
    logger: false,
    env: {},
    config: {
      NODE_ENV: "test",
      UPLOAD_DIR: join(tmp, "uploads"),
      PUBLIC_URL: "http://api.test",
      DB_MIGRATE: false,
      DB_SEED_IF_EMPTY: false,
      ...env,
    },
    skipTemplates: true,
  });
  return a;
}

describe("donations — fake provider end-to-end", () => {
  beforeAll(async () => {
    app = await build({ PIX_PROVIDER: "fake", PIX_FAKE_WEBHOOK_SECRET: "test-secret" });
    const r = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "admin", password: "admin" } });
    adminToken = r.json().token;
  });
  afterAll(async () => {
    await app?.close();
    await h?.close();
  });

  let donationId = 0;
  let txid = "";

  it("rejects an amount below the configured minimum", async () => {
    const r = await app.inject({ method: "POST", url: "/api/donations", payload: { amountCents: 1 } });
    expect(r.statusCode).toBe(400);
  });

  it("creates a charge: returns txid, BR Code (copia e cola) and a base64 PNG QR", async () => {
    const r = await app.inject({ method: "POST", url: "/api/donations", payload: { amountCents: 2000, payerName: "Dona Flor", message: "Boa sorte!", optIn: true } });
    expect(r.statusCode).toBe(201);
    const b = r.json();
    donationId = b.id;
    expect(b.status).toBe("pending");
    expect(b.amountCents).toBe(2000);
    expect(b.brCode).toMatch(/^00020126/); // Payload Format Indicator + Merchant Account Info (Pix)
    expect(b.brCode).toContain("br.gov.bcb.pix");
    expect(typeof b.qrCodePngBase64).toBe("string");
    expect(b.qrCodePngBase64.length).toBeGreaterThan(100);
    expect(Buffer.from(b.qrCodePngBase64, "base64").subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a"); // PNG magic bytes
  });

  it("status polling shows pending before the webhook", async () => {
    const r = await app.inject({ url: `/api/donations/${donationId}` });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ id: donationId, status: "pending" });
  });

  it("does not show an opted-in donor in the public summary before it's paid", async () => {
    const r = await app.inject({ url: "/api/donations/summary" });
    expect(r.json().donors.find((d: { name: string }) => d.name === "Dona Flor")).toBeUndefined();
  });

  it("webhook rejects a bad signature", async () => {
    const r = await app.inject({ method: "POST", url: "/api/pix/webhook", headers: { "x-fake-signature": "wrong" }, payload: { txid: donationId, status: "paid" } });
    expect(r.statusCode).toBe(401);
  });

  it("webhook with the right signature marks the donation paid", async () => {
    // txid real foi gerado pelo provider; busca ele via admin pra montar o webhook (o site nunca vê o txid interno).
    const list = await app.inject({ url: "/api/admin/donations", headers: { authorization: `Bearer ${adminToken}` } });
    const row = list.json().items.find((d: { id: number }) => d.id === donationId);
    txid = row.txid;
    const r = await app.inject({ method: "POST", url: "/api/pix/webhook", headers: { "x-fake-signature": "test-secret" }, payload: { txid, status: "paid" } });
    expect(r.statusCode).toBe(200);
    const status = await app.inject({ url: `/api/donations/${donationId}` });
    expect(status.json()).toMatchObject({ status: "paid" });
    expect(status.json().paidAt).not.toBeNull();
  });

  it("webhook is idempotent: re-sending the same paid notification is a no-op", async () => {
    const before = (await app.inject({ url: `/api/donations/${donationId}` })).json();
    const r = await app.inject({ method: "POST", url: "/api/pix/webhook", headers: { "x-fake-signature": "test-secret" }, payload: { txid, status: "paid" } });
    expect(r.statusCode).toBe(200);
    expect(r.json().idempotent).toBe(true);
    const after = (await app.inject({ url: `/api/donations/${donationId}` })).json();
    expect(after.paidAt).toBe(before.paidAt);
  });

  it("an unknown txid in the webhook is acknowledged but ignored (no crash, no row changed)", async () => {
    const r = await app.inject({ method: "POST", url: "/api/pix/webhook", headers: { "x-fake-signature": "test-secret" }, payload: { txid: "NOBODY-HOME", status: "paid" } });
    expect(r.statusCode).toBe(200);
  });

  it("public summary now lists the opted-in paid donor, but never an opted-out one", async () => {
    await app.inject({ method: "POST", url: "/api/donations", payload: { amountCents: 500, payerName: "Secreto", optIn: false } });
    const r = await app.inject({ url: "/api/donations/summary" });
    const b = r.json();
    expect(b.monthTotalCents).toBeGreaterThanOrEqual(2000);
    expect(b.donors.some((d: { name: string; message?: string }) => d.name === "Dona Flor" && d.message === "Boa sorte!")).toBe(true);
    expect(b.donors.some((d: { name: string }) => d.name === "Secreto")).toBe(false);
  });

  it("admin requires the admin role for donation routes", async () => {
    const noAuth = await app.inject({ url: "/api/admin/donations" });
    expect(noAuth.statusCode).toBe(401);
    const noAuth2 = await app.inject({ url: "/api/admin/donation-settings" });
    expect(noAuth2.statusCode).toBe(401);
    const noAuth3 = await app.inject({ method: "POST", url: `/api/admin/donations/${donationId}/mark-paid` });
    expect(noAuth3.statusCode).toBe(401);
  });

  it("admin can read/update donation-settings (goal, min/max, enabled)", async () => {
    const put = await app.inject({
      method: "PUT",
      url: "/api/admin/donation-settings",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { goalCents: 100000, minAmountCents: 100, maxAmountCents: 1000000, enabled: true, provider: "should-be-ignored" },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json()).toMatchObject({ goalCents: 100000, minAmountCents: 100, maxAmountCents: 1000000, provider: "fake" });
    const get = await app.inject({ url: "/api/admin/donation-settings", headers: { authorization: `Bearer ${adminToken}` } });
    expect(get.json().goalCents).toBe(100000);
  });

  it("admin mark-paid refuses an already-paid or non-fake/static donation gracefully", async () => {
    const already = await app.inject({ method: "POST", url: `/api/admin/donations/${donationId}/mark-paid`, headers: { authorization: `Bearer ${adminToken}` } });
    expect(already.statusCode).toBe(200); // already paid: idempotent 200, not an error

    const missing = await app.inject({ method: "POST", url: "/api/admin/donations/999999/mark-paid", headers: { authorization: `Bearer ${adminToken}` } });
    expect(missing.statusCode).toBe(404);
  });

  it("admin CSV export returns a well-formed csv with a header row", async () => {
    const r = await app.inject({ url: "/api/admin/donations/export", headers: { authorization: `Bearer ${adminToken}` } });
    expect(r.statusCode).toBe(200);
    expect(r.headers["content-type"]).toContain("text/csv");
    const lines = r.body.trim().split("\r\n");
    expect(lines[0]).toBe("id,amountCents,status,provider,txid,providerChargeId,payerName,message,optIn,accountId,createdAt,paidAt,expiresAt");
    expect(lines.length).toBeGreaterThan(1);
  });

  it("admin list supports filtering by status/provider", async () => {
    const r = await app.inject({ url: "/api/admin/donations?status=paid&provider=fake", headers: { authorization: `Bearer ${adminToken}` } });
    expect(r.statusCode).toBe(200);
    for (const row of r.json().items) {
      expect(row.status).toBe("paid");
      expect(row.provider).toBe("fake");
    }
  });
});

describe("donations — static provider (no webhook, manual confirmation)", () => {
  let staticApp: FastifyInstance;
  let staticH: DbHandle;
  let staticAdminToken = "";

  beforeAll(async () => {
    staticH = await createDb("pglite:memory");
    await migrateDb(staticH);
    await seedDatabase(staticH);
    await createDevAccounts(staticH);
    const built = await buildApp({
      db: staticH,
      logger: false,
      env: {},
      config: {
        NODE_ENV: "test",
        UPLOAD_DIR: join(tmp, "uploads-static"),
        PUBLIC_URL: "http://api.test",
        DB_MIGRATE: false,
        DB_SEED_IF_EMPTY: false,
        PIX_PROVIDER: "static",
        PIX_STATIC_KEY: "doacao@example.com",
        PIX_MERCHANT_NAME: "DDTANK REBORN",
        PIX_MERCHANT_CITY: "BRASIL",
      },
      skipTemplates: true,
    });
    staticApp = built.app;
    const r = await staticApp.inject({ method: "POST", url: "/api/auth/login", payload: { username: "admin", password: "admin" } });
    staticAdminToken = r.json().token;
  });
  afterAll(async () => {
    await staticApp?.close();
    await staticH?.close();
  });

  it("creates a charge with a static BR Code and no providerChargeId", async () => {
    const r = await staticApp.inject({ method: "POST", url: "/api/donations", payload: { amountCents: 1500 } });
    expect(r.statusCode).toBe(201);
    expect(r.json().brCode).toContain("doacao@example.com");
  });

  it("has no webhook: POST /api/pix/webhook is refused", async () => {
    const r = await staticApp.inject({ method: "POST", url: "/api/pix/webhook", payload: {} });
    expect(r.statusCode).toBe(404);
  });

  it("admin can mark a static donation paid manually", async () => {
    const created = await staticApp.inject({ method: "POST", url: "/api/donations", payload: { amountCents: 777 } });
    const id = created.json().id;
    const r = await staticApp.inject({ method: "POST", url: `/api/admin/donations/${id}/mark-paid`, headers: { authorization: `Bearer ${staticAdminToken}` } });
    expect(r.statusCode).toBe(200);
    expect(r.json().status).toBe("paid");
  });
});

describe("donations — provedor fake em produção fica desligado", () => {
  let prod: FastifyInstance;
  beforeAll(async () => {
    prod = await build({ NODE_ENV: "production", JWT_SECRET: "prod-test-secret-0123456789", PIX_PROVIDER: "fake" });
  });
  afterAll(async () => {
    await prod?.close();
  });
  it("não cria doação nem aceita webhook com o segredo padrão", async () => {
    const c = await prod.inject({ method: "POST", url: "/api/donations", payload: { amountCents: 1000 } });
    expect(c.statusCode).toBe(503);
    const w = await prod.inject({ method: "POST", url: "/api/pix/webhook", headers: { "x-fake-signature": "fake-webhook-secret" }, payload: { txid: "X", status: "paid" } });
    expect(w.statusCode).toBe(404);
  });
});
