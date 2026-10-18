/**
 * Doação voluntária via Pix (docs/features/doacao-pix.md) — endpoints públicos: criar cobrança, consultar
 * status (polling da página "Apoiar"), resumo público (meta do mês + apoiadores que optaram por aparecer) e
 * o webhook do provedor ativo. Regra inegociável (README "Apoiar"): doação NUNCA dá vantagem de jogo — nada
 * aqui fala com `apps/game`.
 */
import { randomUUID } from "node:crypto";
import { app as appTables } from "@ddt/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppCtx } from "../context.js";
import type { PixProvider, WebhookRequest } from "../pix/types.js";
import { authOf } from "./auth.js";
import { setting } from "./public.js";

export interface DonationSettings {
  enabled: boolean;
  /** Sempre reflete `PIX_PROVIDER` (env) — não é seguro trocar de provedor sem as credenciais certas, então
   *  isto é só informativo no admin, nunca gravado de fato (ver `putDonationSettings`). */
  provider: string;
  goalCents: number;
  minAmountCents: number;
  maxAmountCents: number;
  /** pix-transparencia: custo mensal estimado do servidor (hospedagem/domínio), em centavos — opcional, 0 =
   *  oculta o comparativo "custo × doações" na página pública de transparência (apps/web `/transparencia`). */
  monthlyCostCents: number;
}

export function donationSettingsDefaults(ctx: AppCtx): DonationSettings {
  return {
    enabled: true,
    provider: ctx.cfg.PIX_PROVIDER,
    goalCents: 0,
    minAmountCents: Math.round(ctx.cfg.PIX_MIN_AMOUNT * 100),
    maxAmountCents: Math.round(ctx.cfg.PIX_MAX_AMOUNT * 100),
    monthlyCostCents: 0,
  };
}

export async function donationSettings(ctx: AppCtx): Promise<DonationSettings> {
  const stored = (await setting<Partial<DonationSettings>>(ctx, "donation-settings")) ?? {};
  return { ...donationSettingsDefaults(ctx), ...stored, provider: ctx.cfg.PIX_PROVIDER };
}

/** Grava as configurações editáveis no admin (`enabled`/`goalCents`/`minAmountCents`/`maxAmountCents`); o
 *  campo `provider` do body é sempre ignorado (ver nota acima). */
export async function putDonationSettings(ctx: AppCtx, body: Partial<DonationSettings>): Promise<DonationSettings> {
  const next = { ...(await donationSettings(ctx)), ...body, provider: ctx.cfg.PIX_PROVIDER };
  await ctx.h.db
    .insert(appTables.Settings)
    .values({ key: "donation-settings", value: next })
    .onConflictDoUpdate({ target: appTables.Settings.key, set: { value: next, updatedAt: new Date() } });
  return next;
}

/** txid curto (até 25 alfanuméricos), usado tanto na coluna `txid` quanto no campo EMV 62/05 do BR Code. */
function genTxid(): string {
  return randomUUID().replace(/-/g, "").toUpperCase().slice(0, 25);
}

export async function donationsRoutes(f: FastifyInstance, ctx: AppCtx, provider: PixProvider) {
  // provedor "fake" é só dev/teste: segredo de webhook padrão conhecido + "pago" manual. Em produção sem
  // PIX_PROVIDER configurado as doações ficam desligadas (senão qualquer um forjaria "pago" e o total público).
  const fakeInProd = ctx.cfg.NODE_ENV === "production" && provider.name === "fake";
  if (fakeInProd) ctx.log.warn("Pix: PIX_PROVIDER=fake em produção — doações desativadas (configure static ou mercadopago)");
  f.post(
    "/api/donations",
    { config: { rateLimit: { max: 6, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (fakeInProd) return reply.code(503).send({ message: "Doações ainda não configuradas neste servidor." });
      const ds = await donationSettings(ctx);
      if (!ds.enabled) return reply.code(503).send({ message: "Doações desativadas no momento." });
      const b = z
        .object({
          amountCents: z.number().int().positive(),
          payerName: z.string().trim().max(80).optional(),
          message: z.string().trim().max(500).optional(),
          optIn: z.boolean().optional().default(false),
        })
        .safeParse(req.body);
      if (!b.success) return reply.code(400).send({ message: "Dados inválidos" });
      const { amountCents, payerName, message, optIn } = b.data;
      if (amountCents < ds.minAmountCents || amountCents > ds.maxAmountCents) {
        return reply.code(400).send({ message: `O valor deve estar entre R$ ${(ds.minAmountCents / 100).toFixed(2)} e R$ ${(ds.maxAmountCents / 100).toFixed(2)}.` });
      }
      const txid = genTxid();
      let charge;
      try {
        charge = await provider.createCharge({ txid, amountCents, description: "Doação DDTank Reborn", payerName });
      } catch (e) {
        ctx.log.error(e as object, "pix createCharge failed");
        return reply.code(502).send({ message: "Não foi possível gerar a cobrança Pix. Tente novamente em alguns instantes." });
      }
      const claims = authOf(ctx, req); // opcional: doação funciona sem login
      const [row] = await ctx.h.db
        .insert(appTables.Donations)
        .values({
          amountCents,
          status: "pending",
          provider: provider.name,
          txid: charge.txid,
          providerChargeId: charge.providerChargeId,
          brCode: charge.brCode,
          payerName: optIn && payerName ? payerName : null,
          message: message || null,
          optIn: !!optIn,
          accountId: claims?.sub ?? null,
          expiresAt: charge.expiresAt,
        })
        .returning();
      return reply.code(201).send({
        id: row!.id,
        status: row!.status,
        amountCents: row!.amountCents,
        brCode: charge.brCode,
        qrCodePngBase64: charge.qrCodePngBase64,
        expiresAt: charge.expiresAt.toISOString(),
      });
    },
  );

  f.get<{ Params: { id: string } }>("/api/donations/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(404).send({ message: "Doação não encontrada" });
    const [row] = await ctx.h.db.select().from(appTables.Donations).where(eq(appTables.Donations.id, id)).limit(1);
    if (!row) return reply.code(404).send({ message: "Doação não encontrada" });
    return { id: row.id, status: row.status, amountCents: row.amountCents, paidAt: row.paidAt?.toISOString() ?? null, expiresAt: row.expiresAt?.toISOString() ?? null };
  });

  f.get("/api/donations/summary", async () => {
    const ds = await donationSettings(ctx);
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [tot] = await ctx.h.db
      .select({ sum: sql<string>`COALESCE(SUM(${appTables.Donations.amountCents}), 0)` })
      .from(appTables.Donations)
      .where(and(eq(appTables.Donations.status, "paid"), gte(appTables.Donations.paidAt, monthStart)));
    const donors = await ctx.h.db
      .select({ payerName: appTables.Donations.payerName, amountCents: appTables.Donations.amountCents, message: appTables.Donations.message, paidAt: appTables.Donations.paidAt })
      .from(appTables.Donations)
      .where(and(eq(appTables.Donations.status, "paid"), eq(appTables.Donations.optIn, true), gte(appTables.Donations.paidAt, monthStart)))
      .orderBy(desc(appTables.Donations.paidAt))
      .limit(50);
    return {
      enabled: ds.enabled,
      monthTotalCents: Number(tot?.sum ?? 0),
      goalCents: ds.goalCents,
      minAmountCents: ds.minAmountCents,
      maxAmountCents: ds.maxAmountCents,
      monthlyCostCents: ds.monthlyCostCents,
      donors: donors.map((d) => ({ name: d.payerName || "Anônimo", amountCents: d.amountCents, message: d.message ?? undefined, paidAt: d.paidAt?.toISOString() })),
    };
  });

  /**
   * Webhook do provedor ativo (único por processo — `PIX_PROVIDER`). Idempotente: uma doação já "paid"/
   * "expired" não é reprocessada (PSPs reenviam a mesma notificação por retry). Sempre responde 200 quando a
   * assinatura é válida, mesmo pra txid desconhecido, pra evitar o PSP ficar retentando pra sempre.
   */
  f.post("/api/pix/webhook", async (req, reply) => {
    if (!provider.supportsWebhook || fakeInProd) return reply.code(404).send({ message: "Provedor ativo não usa webhook" });
    const whReq: WebhookRequest = {
      headers: req.headers as Record<string, string | string[] | undefined>,
      body: req.body,
      rawBody: typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}),
      query: req.query as Record<string, string>,
    };
    if (!provider.verifyWebhookSignature(whReq)) return reply.code(401).send({ message: "Assinatura inválida" });
    const result = await provider.parseWebhook(whReq);
    if (!result.txid || result.status === "unknown" || result.status === "pending") return reply.code(200).send({ ok: true });
    const [row] = await ctx.h.db.select().from(appTables.Donations).where(eq(appTables.Donations.txid, result.txid)).limit(1);
    if (!row) return reply.code(200).send({ ok: true }); // txid que não é nosso: nada a fazer, mas confirma recebido
    if (row.status === "paid" || row.status === "expired") return reply.code(200).send({ ok: true, idempotent: true });
    await ctx.h.db
      .update(appTables.Donations)
      .set({ status: result.status, paidAt: result.status === "paid" ? new Date() : row.paidAt, providerChargeId: result.providerChargeId ?? row.providerChargeId })
      .where(eq(appTables.Donations.id, row.id));
    return reply.code(200).send({ ok: true });
  });
}
