/** Admin REST (role admin): generic CRUD over the RESOURCES whitelist + server-config, stats, assets, mail, templates. */
import { app as appTables, game as gameTables, Accounts, applyTranslations, findAccount, hashPassword, loadTranslations } from "@ddt/db";
import { and, asc, count, desc, eq, getTableColumns, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { getTableConfig, type PgColumn, type PgTable } from "drizzle-orm/pg-core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import { join, resolve as resolvePath } from "node:path";
import type { AppCtx } from "../context.js";
import { q } from "../lib/db.js";
import { buildIconPrompt, generateIconPng, iconSizeFor, recraftApiKey, resizePng } from "../lib/icon-style.js";
import { itemIconRel } from "../lib/item-icon.js";
import { splitTranslatable, withTranslationOverlay, writeTranslations } from "../lib/i18n-admin.js";
import { diagnosePve } from "../lib/pve-diagnostics.js";
import { wallNow } from "../lib/flash-xml.js";
import { safeKey } from "../lib/storage.js";
import { RESOURCES, type ResourceDef } from "./admin-resources.js";
import { requireAdmin, userOf } from "./auth.js";
import { donationSettings, putDonationSettings } from "./donations.js";
import { gameInternal, gameInternalPost, setting } from "./public.js";

type Row = Record<string, unknown>;
const ID_SEP = "~";

function cols(t: PgTable): Record<string, PgColumn> {
  return getTableColumns(t) as Record<string, PgColumn>;
}
const tableKey = (t: PgTable) => {
  const c = getTableConfig(t);
  return `${c.schema ?? "public"}.${c.name}`;
};

/** Converts JSON values to what the column expects (ISO strings -> Date for timestamps, numbers from strings). */
function coerce(col: PgColumn, v: unknown): unknown {
  if (v === null || v === undefined) return v;
  const dt = col.dataType;
  if (dt === "date" || col.columnType.includes("Timestamp")) return v instanceof Date ? v : new Date(String(v));
  if (dt === "number") return typeof v === "number" ? v : Number(v);
  if (dt === "boolean") return typeof v === "boolean" ? v : v === "true" || v === 1 || v === "1";
  if (dt === "string" && typeof v !== "string") return typeof v === "object" ? JSON.stringify(v) : String(v);
  return v;
}

function pick(def: ResourceDef, body: Row, opts: { allowPk: boolean }): Row {
  const c = cols(def.table);
  const out: Row = {};
  for (const [k, v] of Object.entries(body ?? {})) {
    const col = c[k];
    if (!col || def.hidden?.includes(k)) continue;
    if (!opts.allowPk && def.pk.includes(k)) continue;
    out[k] = coerce(col, v);
  }
  return out;
}

function pkWhere(def: ResourceDef, id: string): SQL | undefined {
  const parts = decodeURIComponent(id).split(ID_SEP);
  if (parts.length !== def.pk.length) return undefined;
  const c = cols(def.table);
  return and(...def.pk.map((k, i) => eq(c[k]!, coerce(c[k]!, parts[i]))));
}

function strip(def: ResourceDef, r: Row): Row {
  if (!def.hidden) return r;
  const o = { ...r };
  for (const h of def.hidden) delete o[h];
  return o;
}

/**
 * Overlay PT-BR dos itens (`game.Shop_Goods` + `app.Translations`).
 * Como lê esse código (cada variável): `linhas` itens do banco; `overlay` traduções pt-BR; `tid` TemplateID atual;
 * `emLoja` TemplateIDs desta página que têm pelo menos 1 oferta em `game."Shop"` (tabela que o jogo lê pra
 * `ShopItemList.ashx` — ver `defs.ts:478`), usado pro filtro/coluna "Na loja?"; `o` item com Name/Description
 * traduzidos + iconUrl + inShop.
 */
async function withItemOverlay(ctx: AppCtx, linhas: Row[]): Promise<Row[]> {
  if (!linhas.length) return linhas;
  const overlay = await loadTranslations(ctx.h.db, "Shop_Goods", "pt-BR");
  const tids = [...new Set(linhas.map((r) => Number(r.TemplateID)).filter(Number.isFinite))];
  const emLoja = tids.length
    ? new Set(
        (await q(ctx.h, sql`SELECT DISTINCT "TemplateID" FROM game."Shop" WHERE "TemplateID" IN (${sql.join(tids.map((t) => sql`${t}`), sql`, `)})`)).map((r) =>
          Number(r.TemplateID),
        ),
      )
    : new Set<number>();
  return linhas.map((r) => {
    const tid = String(r.TemplateID);
    // site-admin-redesign: "Original (VN)" reference for the admin UI, same contract as
    // `lib/i18n-admin.ts`'s `<field>__original` for the other translatable resources — items just has its
    // own overlay function (icon/inShop live here too) instead of going through `withTranslationOverlay`.
    const o = { ...applyTranslations(r, "TemplateID", overlay) } as Row;
    for (const f of ["Name", "Description", "Remark"]) o[`${f}__original`] = r[f];
    (o as Row).iconUrl = `/api/admin/item-icons/${tid}.png`;
    (o as Row).inShop = emLoja.has(Number(r.TemplateID));
    return o;
  });
}

/** `withItemOverlay` (items, special-cased: icon/inShop too) or the generic `translatable` overlay
 *  (site-admin-redesign) — whichever applies to `def`, else `items` untouched. One call site for list/get/patch. */
async function withOverlays(ctx: AppCtx, def: ResourceDef, resource: string, items: Row[]): Promise<Row[]> {
  if (resource === "items") return withItemOverlay(ctx, items);
  if (def.translatable) return withTranslationOverlay(ctx, def, def.pk[0]!, items);
  return items;
}

/**
 * Busca sem acento ("pédra"/"pedra" acham "Pedra"): usa `translate()` puro do Postgres (sem extensão `unaccent`,
 * que pode não estar disponível/habilitada no Neon), comparando a coluna em minúsculo sem os acentos comuns do
 * PT-BR contra a agulha já normalizada em JS (`agulha.normalize("NFD")` remove os diacríticos combinantes).
 * Como lê esse código (cada variável): `UNACCENT_FROM`/`UNACCENT_TO` mapa 1:1 de acentuado -> simples (mesmo
 * tamanho, exigido pelo `translate`); `semAcento(s)` normaliza uma string; `colSemAcento(col, agulha)` monta a
 * condição `SQL` reaproveitada pela busca genérica e pela busca de traduções.
 */
const UNACCENT_FROM = "áàâãäéèêëíìîïóòôõöúùûüçñ";
const UNACCENT_TO = "aaaaaeeeeiiiiooooouuuucn";
const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
function colSemAcento(col: PgColumn | ReturnType<typeof sql>, agulha: string): SQL {
  const esc = semAcento(agulha).replace(/[%_\\]/g, (x) => "\\" + x);
  return sql`translate(lower(${col}), ${UNACCENT_FROM}, ${UNACCENT_TO}) LIKE ${"%" + esc + "%"}`;
}

/**
 * TemplateIDs cuja tradução PT-BR casa com a busca (sem acento, ver `colSemAcento`).
 * Como lê esse código (cada variável): `agulha` texto buscado; `achados` linhas `rowId` da tradução.
 */
async function itemTraducaoIds(ctx: AppCtx, agulha: string): Promise<number[]> {
  const achados = await ctx.h.db
    .select({ rowId: appTables.Translations.rowId })
    .from(appTables.Translations)
    .where(and(eq(appTables.Translations.table, "Shop_Goods"), eq(appTables.Translations.lang, "pt-BR"), colSemAcento(appTables.Translations.text, agulha)))
    .limit(500);
  return [...new Set(achados.map((r) => Number(r.rowId)).filter((n) => Number.isFinite(n)))];
}

/**
 * Resolve o ícone do item no disco pelo template (`game.Shop_Goods`): as pastas são nomeadas pelo `Pic`, não pelo
 * TemplateID — caminhos de `itemIconRel` (porte de PathManager.as:194 `solveGoodsPath`, param4 "icon").
 * Como lê esse código (cada variável): `iconCache` TemplateID -> arquivo absoluto (ou null = sem ícone); `tid` TemplateID;
 * `g` tabela Shop_Goods; `row` linha do template (CategoryID/Pic/NeedSex); `rel` caminho candidato; `abs` arquivo absoluto no disco.
 */
const iconCache = new Map<number, string | null>();
async function resolveItemIcon(ctx: AppCtx, tid: number): Promise<string | undefined> {
  const hit = iconCache.get(tid);
  // Um hit cujo arquivo não existe mais (ex. alguém apagou o upload em /api/admin/assets por fora do fluxo de
  // ícone) não é confiável — resolve de novo em vez de 404 até o próximo /icon/accept ou reinício.
  if (hit !== undefined && (hit === null || existsSync(hit))) return hit ?? undefined;
  const g = gameTables.Shop_Goods;
  const [row] = await ctx.h.db
    .select({ CategoryID: g.CategoryID, Pic: g.Pic, NeedSex: g.NeedSex })
    .from(g)
    .where(eq(g.TemplateID, tid))
    .limit(1);
  if (!row) return undefined; // item inexistente: não cacheia (pode ser criado depois)
  let abs: string | undefined;
  for (const rel of itemIconRel(row.CategoryID, row.Pic ?? "", row.NeedSex)) {
    abs = ctx.resources.resolve(rel);
    if (abs) break;
  }
  iconCache.set(tid, abs ?? null);
  return abs;
}

export async function audit(ctx: AppCtx, actor: string | null, category: string, message: string, data?: unknown, level = "info") {
  try {
    await ctx.h.db.insert(appTables.Logs).values({ actor, category, message, data: data as object, level });
  } catch (e) {
    ctx.log.warn(`audit failed: ${(e as Error).message}`);
  }
}

/** Defaults of the server-config page, from env; stored overrides in app."Settings"("server-config"). */
export function serverConfigDefaults(ctx: AppCtx): Row {
  const c = ctx.cfg;
  return {
    publicHost: c.GAME_HOST,
    publicIps: [c.GAME_HOST],
    tcpPort: c.GAME_PORT,
    wsUrl: c.GAME_WS_URL,
    policyPort: c.POLICY_PORT,
    resourceUrl: `${c.PUBLIC_URL}/resource/`,
    requestUrl: `${c.PUBLIC_URL}/request/`,
    flashUrl: `${c.PUBLIC_URL}/flash/`,
    expRate: 1,
    goldRate: 1,
    dropRate: 1,
    offerRate: 1,
    maxPlayers: 1000,
    maintenance: false,
    maintenanceMessage: "",
    motd: "",
    /** task multi-char: max characters (slots) an account may create, enforced server-side in
     *  apps/api/src/routes/auth.ts `charLimit` (never just a client-side UI check) — never sold, see
     *  AGENTS.md "No pay-to-win". Admin-editable range [1, 10]. */
    maxCharactersPerAccount: 3,
    /** Elevation angles (degrees) for the Play page's "Âng. N: Distância | Força" reference tables, computed by
     *  GET /api/public/aim-tables (`@ddt/fight` `computeAimTable`, same physics as the server). */
    aimAngles: ["20", "30", "50", "65"],
  };
}

/** Applies stored network settings to the running config (ServerList.ashx, play config, config.xml). */
export function applyServerConfig(ctx: AppCtx, v: Row) {
  if (typeof v.publicHost === "string" && v.publicHost) ctx.cfg.GAME_HOST = v.publicHost;
  if (Number(v.tcpPort)) ctx.cfg.GAME_PORT = Number(v.tcpPort);
  if (typeof v.wsUrl === "string" && v.wsUrl) ctx.cfg.GAME_WS_URL = v.wsUrl;
  if (Number(v.policyPort)) ctx.cfg.POLICY_PORT = Number(v.policyPort);
}

const memSeries: { t: string; v: number }[] = [];
const cpuSeries: { t: string; v: number }[] = [];
let lastCpu = process.cpuUsage();
let lastT = Date.now();
export function sampleProcess() {
  const now = Date.now();
  const cu = process.cpuUsage(lastCpu);
  const pct = ((cu.user + cu.system) / 1000 / Math.max(1, now - lastT)) * 100;
  lastCpu = process.cpuUsage();
  lastT = now;
  const t = new Date(now).toISOString();
  cpuSeries.push({ t, v: Math.round(pct * 10) / 10 });
  memSeries.push({ t, v: Math.round(process.memoryUsage().rss / 1048576) });
  if (cpuSeries.length > 60) cpuSeries.shift();
  if (memSeries.length > 60) memSeries.shift();
}

export async function adminRoutes(f: FastifyInstance, ctx: AppCtx) {
  // drop whitelist entries whose PK columns don't exist (defensive: heaps without a real key)
  for (const [name, def] of Object.entries(RESOURCES)) {
    const c = cols(def.table);
    if (!def.pk.every((k) => c[k])) {
      ctx.log.warn(`admin resource "${name}" disabled: pk ${def.pk.join(",")} not in ${tableKey(def.table)}`);
      delete RESOURCES[name];
    }
  }

  const guard = requireAdmin(ctx);
  const actor = (req: FastifyRequest) => userOf(req)?.name ?? null;

  // ---- specific endpoints (registered before the generic :resource routes) ----
  f.get("/api/admin/stats", { preHandler: guard }, async () => {
    const g = await gameInternal<Row>(ctx, "/stats");
    sampleProcess();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [reg] = await ctx.h.db.select({ n: count() }).from(Accounts).where(sql`${Accounts.CreatedAt} >= ${today}`);
    const sc = { ...serverConfigDefaults(ctx), ...((await setting<Row>(ctx, "server-config")) ?? {}) };
    return {
      onlinePlayers: 0,
      capacity: Number(sc.maxPlayers ?? 1000),
      rooms: 0,
      matchesInProgress: 0,
      matchesToday: 0,
      uptimeSec: Math.floor((Date.now() - ctx.startedAt.getTime()) / 1000),
      cpu: [...cpuSeries],
      mem: [...memSeries],
      memTotalMb: Math.round(os.totalmem() / 1048576),
      ...(g ?? {}),
      registeredToday: Number(reg?.n ?? 0),
      gameOnline: !!g,
    };
  });

  f.get("/api/admin/server-config", { preHandler: guard }, async () => ({ ...serverConfigDefaults(ctx), ...((await setting<Row>(ctx, "server-config")) ?? {}) }));
  f.put("/api/admin/server-config", { preHandler: guard }, async (req) => {
    const v = { ...serverConfigDefaults(ctx), ...((await setting<Row>(ctx, "server-config")) ?? {}), ...((req.body as Row) ?? {}) };
    await ctx.h.db
      .insert(appTables.Settings)
      .values({ key: "server-config", value: v })
      .onConflictDoUpdate({ target: appTables.Settings.key, set: { value: v, updatedAt: new Date() } });
    applyServerConfig(ctx, v);
    // expRate/goldRate/dropRate/offerRate are all cached in apps/game's Templates (templates.rates,
    // db/templates.ts; 41-stubs-rates wired dropRate/offerRate too) — reload now so a rate change applies
    // live instead of only after the next restart.
    void gameInternalPost(ctx, "/reload-templates");
    await audit(ctx, actor(req), "config", "server-config updated", v);
    return v;
  });

  // ---- doações (Pix) ----
  f.get("/api/admin/donation-settings", { preHandler: guard }, async () => donationSettings(ctx));
  f.put("/api/admin/donation-settings", { preHandler: guard }, async (req) => {
    const v = await putDonationSettings(ctx, (req.body ?? {}) as Row);
    await audit(ctx, actor(req), "donations", "donation-settings updated", v);
    return v;
  });
  /**
   * Confirmação manual: só pra "fake" (teste) e "static" (Pix sem PSP/webhook — o dono confere o extrato do
   * banco por fora e marca aqui). "mercadopago" (e qualquer outro PSP real) é sempre confirmado pelo
   * `POST /api/pix/webhook`, nunca por aqui — evita marcar uma doação "paga" sem o dinheiro ter de fato caído.
   */
  f.post<{ Params: { id: string } }>("/api/admin/donations/:id/mark-paid", { preHandler: guard }, async (req, reply) => {
    const id = Number(req.params.id);
    const [row] = await ctx.h.db.select().from(appTables.Donations).where(eq(appTables.Donations.id, id)).limit(1);
    if (!row) return reply.code(404).send({ message: "Doação não encontrada" });
    if (row.provider !== "fake" && row.provider !== "static") return reply.code(400).send({ message: `Doações do provedor "${row.provider}" só são confirmadas pelo webhook.` });
    if (row.status === "paid") return reply.code(200).send(row);
    const [updated] = await ctx.h.db.update(appTables.Donations).set({ status: "paid", paidAt: new Date() }).where(eq(appTables.Donations.id, id)).returning();
    await audit(ctx, actor(req), "donations", `donation #${id} marked paid`, { amountCents: row.amountCents, provider: row.provider });
    return updated;
  });
  /** CSV das doações (conciliação/contabilidade). Filtros opcionais iguais à listagem (status/provider). */
  f.get<{ Querystring: { status?: string; provider?: string } }>("/api/admin/donations/export", { preHandler: guard }, async (req, reply) => {
    const c = cols(appTables.Donations);
    const conds: SQL[] = [];
    if (req.query.status) conds.push(eq(c.status!, req.query.status));
    if (req.query.provider) conds.push(eq(c.provider!, req.query.provider));
    const rows = await ctx.h.db
      .select()
      .from(appTables.Donations)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(appTables.Donations.createdAt));
    const csvCell = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = v instanceof Date ? v.toISOString() : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["id", "amountCents", "status", "provider", "txid", "providerChargeId", "payerName", "message", "optIn", "accountId", "createdAt", "paidAt", "expiresAt"];
    const lines = [header.join(","), ...rows.map((r) => header.map((k) => csvCell((r as Row)[k])).join(","))];
    return reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="doacoes-${new Date().toISOString().slice(0, 10)}.csv"`)
      .send(lines.join("\r\n"));
  });

  // ---- assets / uploads ----
  const upload = async (req: FastifyRequest) => {
    const parts = req.parts();
    let folder = "uploads";
    let file: { name: string; body: Buffer; type: string } | undefined;
    for await (const p of parts) {
      if (p.type === "file") file = { name: p.filename, body: await p.toBuffer(), type: p.mimetype };
      else if (p.fieldname === "folder") folder = String(p.value ?? "uploads");
    }
    if (!file) return null;
    const key = `${safeKey(folder)}/${safeKey(file.name)}`;
    const asset = await ctx.storage.put(key, file.body, file.type);
    if (ctx.storage.kind === "local" && ctx.storage.dir) ctx.resources.trees[0]?.add(asset.key, `${ctx.storage.dir}/${asset.key}`);
    await audit(ctx, actor(req), "assets", `upload ${asset.key}`, { size: asset.size });
    return asset;
  };
  f.post("/api/admin/uploads", { preHandler: guard }, async (req, reply) => {
    const a = await upload(req);
    if (!a) return reply.code(400).send({ message: "Arquivo ausente" });
    return reply.code(201).send({ url: a.url, key: a.key });
  });
  f.post("/api/admin/assets", { preHandler: guard }, async (req, reply) => {
    const a = await upload(req);
    if (!a) return reply.code(400).send({ message: "Arquivo ausente" });
    return reply.code(201).send(a);
  });
  f.get<{ Querystring: { prefix?: string } }>("/api/admin/assets", { preHandler: guard }, async (req) => ctx.storage.list(req.query.prefix ?? ""));
  f.get("/api/admin/assets/misses", { preHandler: guard }, async () =>
    [...ctx.resources.misses.entries()].sort((a, b) => b[1] - a[1]).map(([path, count]) => ({ path, count })),
  );
  f.delete<{ Params: { key: string } }>("/api/admin/assets/:key", { preHandler: guard }, async (req, reply) => {
    const key = decodeURIComponent(req.params.key);
    await ctx.storage.remove(key);
    ctx.resources.trees[0]?.remove(safeKey(key));
    await audit(ctx, actor(req), "assets", `delete ${key}`);
    return reply.code(204).send();
  });

  // ---- events / scheduler (apps/game internal channel) ----
  f.get("/api/admin/events/status", { preHandler: guard }, async (_req, reply) => (await gameInternal(ctx, "/events")) ?? reply.code(503).send({ message: "Servidor de jogo indisponível" }));
  f.post("/api/admin/events/start", { preHandler: guard }, async (req, reply) => {
    const b = (req.body ?? {}) as Row;
    const r = await gameInternalPost(ctx, "/events/start", { kind: String(b.kind ?? ""), minutes: Number(b.minutes ?? 30) });
    await audit(ctx, actor(req), "events", `start ${b.kind} ${b.minutes ?? 30} min`);
    return r ?? reply.code(503).send({ message: "Servidor de jogo indisponível" });
  });
  f.post("/api/admin/events/stop", { preHandler: guard }, async (req, reply) => {
    const b = (req.body ?? {}) as Row;
    const r = await gameInternalPost(ctx, "/events/stop", { kind: String(b.kind ?? "") });
    await audit(ctx, actor(req), "events", `stop ${b.kind}`);
    return r ?? reply.code(503).send({ message: "Servidor de jogo indisponível" });
  });
  f.post("/api/admin/events/reload", { preHandler: guard }, async (req, reply) => {
    const r = await gameInternalPost(ctx, "/reload-templates");
    await audit(ctx, actor(req), "events", "reload");
    return r ?? reply.code(503).send({ message: "Servidor de jogo indisponível" });
  });
  /** Activation codes for an Active with HasKey 1/4 (player."Active_Number"), like the GameAdmin code generator. */
  f.post<{ Params: { id: string } }>("/api/admin/events/:id/codes", { preHandler: guard }, async (req) => {
    const b = (req.body ?? {}) as Row;
    const n = Math.max(1, Math.min(1000, Number(b.count ?? 10)));
    const mark = Number(b.mark ?? 0);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const codes: string[] = [];
    for (let i = 0; i < n; i++) {
      const bytes = crypto.getRandomValues(new Uint8Array(14));
      codes.push(Array.from(bytes, (x) => alphabet[x % alphabet.length]).join(""));
    }
    for (const c of codes) await ctx.h.db.execute(sql`INSERT INTO player."Active_Number" ("AwardID","ActiveID","PullDown","UserID","Mark") VALUES (${c}, ${Number(req.params.id)}, false, 0, ${mark}) ON CONFLICT DO NOTHING`);
    await audit(ctx, actor(req), "events", `codes ${req.params.id} x${n}`);
    return { codes };
  });
  /**
   * ch-eventos: aviso ao vivo pra quem está online AGORA (center SYS_NOTICE -> 3 SYS_MESSAGE), diferente de
   * `/api/admin/mail/broadcast` (correio assíncrono, alcança até os offline). `gameInternalPost` só fala com o
   * canal LOCAL (`GAME_INTERNAL_URL`) — alcançar os OUTROS canais é responsabilidade do próprio `apps/game`
   * (`bus/cross-channel.ts` `ctx.crossChannel.systemNotice`, relay automático quando o barramento está ativo;
   * sem barramento/canal único o aviso já cobre todo mundo, igual sempre).
   */
  f.post("/api/admin/broadcast", { preHandler: guard }, async (req, reply) => {
    const b = (req.body ?? {}) as Row;
    if (typeof b.msg !== "string" || !b.msg.trim()) return reply.code(400).send({ message: "Mensagem é obrigatória" });
    const r = await gameInternalPost(ctx, "/broadcast", { msg: b.msg.slice(0, 1000), type: typeof b.type === "number" ? b.type : 3 });
    await audit(ctx, actor(req), "broadcast", `"${b.msg.slice(0, 80)}"`);
    return r ?? reply.code(503).send({ message: "Servidor de jogo indisponível" });
  });
  /**
   * 41-hot-update: botão "Aplicar agora"/"Atualizar jogo ao vivo" (apps/admin ServerConfig.tsx) — reloada os
   * templates/eventos no `apps/game` E empurra pros jogadores já conectados os pacotes de refresh que o
   * cliente entende sem relogar (`admin/hot-update.ts applyHotUpdate`, docs/features/hot-update.md tem o mapa
   * completo). `kinds` vazio/ausente = tudo que o módulo sabe empurrar (items/shop/quests/events/config);
   * `notice` opcional manda um aviso (3 SYS_MESSAGE) junto. `gameInternalPost` só fala com o canal LOCAL — os
   * OUTROS canais são alcançados pelo próprio `apps/game` (`ctx.crossChannel.hotUpdate`, igual `/broadcast`).
   */
  f.post("/api/admin/hot-update", { preHandler: guard }, async (req, reply) => {
    const b = (req.body ?? {}) as Row;
    const kinds = Array.isArray(b.kinds) ? b.kinds.filter((k): k is string => typeof k === "string") : [];
    const notice = typeof b.notice === "string" && b.notice.trim() ? b.notice.slice(0, 1000) : undefined;
    const r = await gameInternalPost(ctx, "/hot-update", { kinds, notice });
    await audit(ctx, actor(req), "hot-update", `kinds=${kinds.length ? kinds.join(",") : "all"}${notice ? ` notice="${notice.slice(0, 80)}"` : ""}`, { kinds, notice });
    return r ?? reply.code(503).send({ message: "Servidor de jogo indisponível" });
  });

  // ---- templates (XML cache) ----
  f.get("/api/admin/templates", { preHandler: guard }, async () =>
    ctx.cache.list().map((x) => ({ name: x.name, compressed: x.compressed, size: x.body.length, builtAt: x.builtAt, source: x.source })),
  );
  f.post("/api/admin/templates/rebuild", { preHandler: guard }, async (req) => {
    const t0 = Date.now();
    await ctx.cache.buildAll();
    await audit(ctx, actor(req), "templates", "rebuild all");
    return { ok: true, ms: Date.now() - t0, files: ctx.cache.list().length };
  });

  // ---- mail ----
  // drizzle expands a JS array param to a tuple ($1, $2), which `= ANY(...)` rejects: build IN (...) instead
  const nickIn = (names: string[]) => (names.length ? sql`"NickName" IN (${sql.join(names.map((n) => sql`${n}`), sql`, `)})` : sql`false`);
  f.post("/api/admin/mail/broadcast", { preHandler: guard }, async (req, reply) => {
    const b = (req.body ?? {}) as Row;
    if (!b.subject || !b.body) return reply.code(400).send({ message: "Assunto e mensagem são obrigatórios" });
    const target = String(b.target ?? "all");
    const where =
      target === "online"
        ? sql`"State" = 1`
        : target === "level"
          ? sql`"Grade" BETWEEN ${Number(b.levelMin ?? 1)} AND ${Number(b.levelMax ?? 100)}`
          : target === "list"
            ? nickIn((Array.isArray(b.nicknames) ? b.nicknames : []).map(String))
            : sql`true`;
    const users = await q(ctx.h, sql`SELECT "UserID","NickName" FROM player."Sys_Users_Detail" WHERE "IsExist" = true AND "NickName" <> '' AND ${where}`);
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 5) as Row[];
    for (const u of users) await sendMail(ctx, Number(u.UserID), String(u.NickName), String(b.subject), String(b.body), { gold: Number(b.gold ?? 0), money: Number(b.money ?? 0), giftToken: Number(b.giftToken ?? 0), items });
    await ctx.h.db.insert(appTables.MailBroadcasts).values({ subject: String(b.subject), target, recipients: users.length, sentBy: actor(req), payload: b });
    await audit(ctx, actor(req), "mail", `broadcast "${b.subject}" to ${users.length}`);
    return { recipients: users.length };
  });

  // ---- player actions ----
  f.post<{ Params: { id: string; action: string } }>("/api/admin/players/:id/:action", { preHandler: guard }, async (req, reply) => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Row;
    const [u] = await q(ctx.h, sql`SELECT "UserID","NickName" FROM player."Sys_Users_Detail" WHERE "UserID" = ${id}`);
    if (!u) return reply.code(404).send({ message: "Jogador não encontrado" });
    if (req.params.action === "ban") {
      const hours = Number(b.hours ?? 0);
      const until = new Date(wallNow().getTime() + (hours > 0 ? hours * 3600_000 : 100 * 365 * 86400_000));
      await ctx.h.db.execute(sql`UPDATE player."Sys_Users_Detail" SET "ForbidDate" = ${until}, "ForbidReason" = ${String(b.reason ?? "")}, "IsExist" = false WHERE "UserID" = ${id}`);
    } else if (req.params.action === "unban") {
      await ctx.h.db.execute(sql`UPDATE player."Sys_Users_Detail" SET "ForbidDate" = ${new Date(Date.UTC(2000, 0, 1))}, "ForbidReason" = '', "IsExist" = true WHERE "UserID" = ${id}`);
    } else if (req.params.action === "give-item") {
      /**
       * Entrega item ao jogador: `viaMail` true manda sempre por correio (GM); false tenta mochila direto
       * (online: game server em memória; offline: insert direto no banco), só cai pro correio se a mochila falhar.
       * Como lê esse código (cada variável): `tid` id do template; `count` quantidade pedida; `validDays` dias
       * validade (repassado ao anexo do correio); `viaMail` checkbox "Enviar por correio" do picker; `u` jogador
       * dono; `tpl` template achado; `livre` slot vago BagType 0; `now` hora atual.
       */
      const tid = Number(b.templateId ?? b.TemplateID);
      const count = Number(b.count ?? 1);
      const validDays = Number(b.validDays ?? 0);
      const viaMail = b.viaMail === true;
      if (!tid) return reply.code(400).send({ message: "templateId é obrigatório" });
      if (!Number.isFinite(count) || count <= 0) return reply.code(400).send({ message: "count deve ser maior que zero" });
      const tpl = await q(ctx.h, sql`SELECT "TemplateID" FROM game."Shop_Goods" WHERE "TemplateID" = ${tid} LIMIT 1`);
      if (!tpl.length) return reply.code(404).send({ message: "Template não encontrado" });
      if (viaMail) {
        // Correio sempre (mesmo online): grava Sys_Users_Goods + User_Messages; avisa o game pra acender o ícone na hora.
        await sendMail(ctx, id, String(u.NickName), "GM", "Item", { items: [{ templateId: tid, count, validDays }] });
        try {
          await fetch(`${ctx.cfg.GAME_INTERNAL_URL}/mail-notice`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ userId: id }),
            signal: AbortSignal.timeout(3000),
          });
        } catch {
          // best-effort: sem aviso em tempo real, o jogador recebe a carta no próximo refresh/login.
        }
      } else {
        // Online: entrega pelo game server (bolsa em memória); insert direto no banco seria sobrescrito no próximo save.
        let online = false;
        try {
          const r = await fetch(`${ctx.cfg.GAME_INTERNAL_URL}/give-item`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ userId: id, templateId: tid, count }),
            signal: AbortSignal.timeout(3000),
          });
          online = r.ok;
        } catch {
          online = false;
        }
        if (!online) try {
          const now = wallNow();
          const ocup = await q(ctx.h, sql`SELECT "Place" FROM player."Sys_Users_Goods" WHERE "UserID" = ${id} AND "BagType" = 0 AND "IsExist" = true ORDER BY "Place"`);
          const usados = new Set((ocup as Row[]).map((r) => Number(r.Place)));
          let livre = -1;
          for (let p = 31; p <= 49; p++) if (!usados.has(p)) { livre = p; break; }
          if (livre < 0) throw new Error("bag cheia");
          await ctx.h.db.execute(sql`INSERT INTO player."Sys_Users_Goods" ("UserID","BagType","TemplateID","Place","Count","IsJudge","Color","IsExist","StrengthenLevel","AttackCompose","DefendCompose","LuckCompose","AgilityCompose","IsBinds","BeginDate","ValidDate","IsUsed")
            VALUES (${id}, 0, ${tid}, ${livre}, ${count}, true, '', true, 0, 0, 0, 0, 0, true, ${now}, ${validDays}, false)`);
        } catch {
          await sendMail(ctx, id, String(u.NickName), "GM", "Item", { items: [{ templateId: tid, count, validDays }] });
        }
      }
    } else return reply.code(404).send({ message: "Ação desconhecida" });
    await audit(ctx, actor(req), "players", `${req.params.action} ${u.NickName} (${id})`, b);
    return { ok: true };
  });

  // ---- admin users (member.Accounts + app.AccountRoles) ----
  const R = appTables.AccountRoles;
  const adminRow = (a: typeof Accounts.$inferSelect, r?: typeof R.$inferSelect) => ({
    id: a.ID,
    username: a.UserName,
    email: a.Email ?? "",
    role: r?.role ?? (a.IsAdmin ? "admin" : "player"),
    active: r ? r.active : a.IsAdmin,
    lastLoginAt: a.LastLoginAt,
  });
  f.get("/api/admin/admin-users", { preHandler: guard }, async (req) => {
    const rows = await ctx.h.db.select().from(Accounts).leftJoin(R, eq(R.AccountID, Accounts.ID)).where(or(eq(Accounts.IsAdmin, true), sql`${R.AccountID} IS NOT NULL`));
    const items = rows.map((r) => adminRow(r.Accounts, r.AccountRoles ?? undefined));
    const qs = req.query as Row;
    return { items, total: items.length, page: Number(qs.page ?? 1), pageSize: Number(qs.pageSize ?? 20) };
  });
  f.post("/api/admin/admin-users", { preHandler: guard }, async (req, reply) => {
    const b = (req.body ?? {}) as Row;
    if (!b.username || !b.password) return reply.code(400).send({ message: "Usuário e senha são obrigatórios" });
    if (await findAccount(ctx.h, String(b.username))) return reply.code(409).send({ message: "username já existe" });
    const role = String(b.role ?? "admin");
    const [a] = await ctx.h.db.insert(Accounts).values({ UserName: String(b.username), Email: (b.email as string) ?? null, PasswordHash: await hashPassword(String(b.password)), IsAdmin: role === "admin" }).returning();
    await ctx.h.db.insert(R).values({ AccountID: a!.ID, role, active: b.active !== false });
    await audit(ctx, actor(req), "admin-users", `create ${a!.UserName} (${role})`);
    return reply.code(201).send(adminRow(a!, { AccountID: a!.ID, role, active: b.active !== false }));
  });
  f.patch<{ Params: { id: string } }>("/api/admin/admin-users/:id", { preHandler: guard }, async (req, reply) => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Row;
    const [a] = await ctx.h.db.select().from(Accounts).where(eq(Accounts.ID, id));
    if (!a) return reply.code(404).send({ message: "Não encontrado" });
    const [cur] = await ctx.h.db.select().from(R).where(eq(R.AccountID, id));
    const role = String(b.role ?? cur?.role ?? (a.IsAdmin ? "admin" : "gm"));
    const active = b.active === undefined ? (cur?.active ?? true) : !!b.active;
    const set: Partial<typeof Accounts.$inferInsert> = { IsAdmin: role === "admin" && active };
    if (b.email !== undefined) set.Email = String(b.email);
    if (b.password) set.PasswordHash = await hashPassword(String(b.password));
    const [na] = await ctx.h.db.update(Accounts).set(set).where(eq(Accounts.ID, id)).returning();
    await ctx.h.db.insert(R).values({ AccountID: id, role, active }).onConflictDoUpdate({ target: R.AccountID, set: { role, active } });
    await audit(ctx, actor(req), "admin-users", `update ${a.UserName}`);
    return adminRow(na!, { AccountID: id, role, active });
  });
  f.get<{ Params: { id: string } }>("/api/admin/admin-users/:id", { preHandler: guard }, async (req, reply) => {
    const [r] = await ctx.h.db.select().from(Accounts).leftJoin(R, eq(R.AccountID, Accounts.ID)).where(eq(Accounts.ID, Number(req.params.id)));
    return r ? adminRow(r.Accounts, r.AccountRoles ?? undefined) : reply.code(404).send({ message: "Não encontrado" });
  });
  f.delete<{ Params: { id: string } }>("/api/admin/admin-users/:id", { preHandler: guard }, async (req, reply) => {
    const id = Number(req.params.id);
    if (id === userOf(req).sub) return reply.code(400).send({ message: "Você não pode remover a si mesmo" });
    await ctx.h.db.update(Accounts).set({ IsAdmin: false }).where(eq(Accounts.ID, id));
    await ctx.h.db.delete(R).where(eq(R.AccountID, id));
    await audit(ctx, actor(req), "admin-users", `revoke ${id}`);
    return reply.code(204).send();
  });

  // ---- generic CRUD ----
  const resolve = (name: string) => RESOURCES[name];

  f.get<{
    Params: { resource: string };
    Querystring: {
      q?: string;
      page?: string;
      pageSize?: string;
      sort?: string;
      category?: string;
      sex?: string;
      quality?: string;
      inShop?: string;
      levelMin?: string;
      levelMax?: string;
      idMin?: string;
      idMax?: string;
      status?: string;
      provider?: string;
      ids?: string;
    };
  }>(
    "/api/admin/:resource",
    { preHandler: guard },
    async (req, reply) => {
      const def = resolve(req.params.resource);
      if (!def) return reply.code(404).send({ message: "Recurso desconhecido" });
      const c = cols(def.table);
      /**
       * Batched lookup for the admin "ref" field (apps/admin/src/crud/refs.ts): `?ids=1,2,3` returns exactly
       * those rows (by PK), ignoring pagination/search/sort — ONE request resolves every row a table page
       * needs for a given target resource, instead of one request per cell. Single-column PK only (every
       * current ref target has one); a composite-PK resource 400s instead of silently matching nothing.
       */
      if (req.query.ids !== undefined) {
        if (def.pk.length !== 1) return reply.code(400).send({ message: "Recurso com chave composta não suporta ?ids=" });
        const pkCol = c[def.pk[0]!]!;
        // A stray out-of-range id (e.g. a number past Postgres' int4, pasted/typed by mistake) must never 500 —
        // it just can't match anything, same as any other id this resource doesn't have.
        const PG_INT4_MAX = 2147483647;
        const idVals = [...new Set(req.query.ids.split(",").map((s) => s.trim()).filter(Boolean))]
          .slice(0, 500)
          .map((v) => coerce(pkCol, v))
          .filter((v) => typeof v !== "number" || (Number.isFinite(v) && Math.abs(v) <= PG_INT4_MAX));
        if (!idVals.length) return { items: [], total: 0, page: 1, pageSize: 0 };
        const rows = (await ctx.h.db.select().from(def.table).where(inArray(pkCol, idVals)).limit(500)) as Row[];
        const items = rows.map((r) => strip(def, r));
        const withOverlay = await withOverlays(ctx, def, req.params.resource, items);
        return { items: withOverlay, total: withOverlay.length, page: 1, pageSize: withOverlay.length };
      }
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize) || 20));
      const conds: SQL[] = [];
      // Página Doações: filtro por status/provedor (ver apps/admin/src/resources/donations.ts "filters").
      if (req.params.resource === "donations") {
        if (req.query.status && c.status) conds.push(eq(c.status, req.query.status));
        if (req.query.provider && c.provider) conds.push(eq(c.provider, req.query.provider));
      }
      // Picker de item (ex. arma de bot) + filtro "Categoria" da Grade de ícones: restringe por CategoryID, só no resource "items".
      if (req.params.resource === "items" && req.query.category && c.CategoryID) {
        const ids = req.query.category.split(",").map(Number).filter(Number.isFinite);
        if (ids.length) conds.push(inArray(c.CategoryID, ids));
      }
      // Filtros extras da página Itens (Sexo/Qualidade/Nível/faixa de TemplateID/"Na loja?") — só no resource "items".
      if (req.params.resource === "items") {
        const qy = req.query;
        if (c.NeedSex && qy.sex !== undefined && qy.sex !== "") conds.push(eq(c.NeedSex, Number(qy.sex)));
        if (c.Quality && qy.quality !== undefined && qy.quality !== "") conds.push(eq(c.Quality, Number(qy.quality)));
        if (c.NeedLevel && qy.levelMin !== undefined && qy.levelMin !== "") conds.push(gte(c.NeedLevel, Number(qy.levelMin)));
        if (c.NeedLevel && qy.levelMax !== undefined && qy.levelMax !== "") conds.push(lte(c.NeedLevel, Number(qy.levelMax)));
        if (c.TemplateID && qy.idMin !== undefined && qy.idMin !== "") conds.push(gte(c.TemplateID, Number(qy.idMin)));
        if (c.TemplateID && qy.idMax !== undefined && qy.idMax !== "") conds.push(lte(c.TemplateID, Number(qy.idMax)));
        if (c.TemplateID && (qy.inShop === "1" || qy.inShop === "0")) {
          const existsEmLoja = sql`EXISTS (SELECT 1 FROM game."Shop" s WHERE s."TemplateID" = ${c.TemplateID})`;
          conds.push(qy.inShop === "1" ? existsEmLoja : sql`NOT ${existsEmLoja}`);
        }
      }
      /**
       * Generic per-column filter (admin-ux-2, see the doc comment atop `admin-resources.ts`): `cf_<field>` /
       * `cf_<field>_min` / `cf_<field>_max`, built client-side by `apps/admin/src/crud/ColumnFilters.tsx`
       * `buildColFilterParams`. Cast needed because these keys aren't in the typed `Querystring` above —
       * Fastify still parses every query param regardless, the interface only narrows the known ones.
       */
      for (const [key, raw] of Object.entries(req.query as unknown as Record<string, string | undefined>)) {
        if (!key.startsWith("cf_") || raw === undefined || raw === "") continue;
        const range = /^cf_(.+)_(min|max)$/.exec(key);
        if (range) {
          const col = Object.hasOwn(c, range[1]!) ? c[range[1]!] : undefined;
          if (!col || !Number.isFinite(Number(raw))) continue;
          conds.push(range[2] === "min" ? gte(col, Number(raw)) : lte(col, Number(raw)));
          continue;
        }
        const col = Object.hasOwn(c, key.slice(3)) ? c[key.slice(3)] : undefined;
        if (!col) continue;
        if (col.dataType === "number" && !Number.isFinite(Number(raw))) continue;
        if (col.dataType === "boolean") conds.push(eq(col, raw === "1" || raw === "true"));
        else if (col.dataType === "number") conds.push(eq(col, Number(raw)));
        else conds.push(colSemAcento(col, raw));
      }
      const needle = (req.query.q ?? "").trim();
      if (needle) {
        const ors: SQL[] = [];
        for (const [k, col] of Object.entries(c)) {
          if (def.hidden?.includes(k)) continue;
          if (col.dataType === "string" && !col.columnType.includes("Json")) ors.push(colSemAcento(col, needle));
          else if (col.dataType === "number" && /^-?\d+$/.test(needle)) ors.push(eq(col, Number(needle)));
        }
        if (req.params.resource === "items" && c.TemplateID) {
          const tids = await itemTraducaoIds(ctx, needle);
          if (tids.length) ors.push(inArray(c.TemplateID, tids));
        }
        if (ors.length) conds.push(or(...ors)!);
      }
      let order: SQL[] = def.pk.map((k) => asc(c[k]!));
      const sort = req.query.sort;
      if (sort) {
        const d = sort.startsWith("-");
        const col = c[d ? sort.slice(1) : sort];
        if (col) order = [d ? desc(col) : asc(col), ...order];
      }
      const where = conds.length ? and(...conds) : undefined;
      const [tot] = await ctx.h.db.select({ n: count() }).from(def.table).where(where);
      const rows = await ctx.h.db.select().from(def.table).where(where).orderBy(...order).limit(pageSize).offset((page - 1) * pageSize);
      const items = (rows as Row[]).map((r) => strip(def, r));
      return { items: await withOverlays(ctx, def, req.params.resource, items), total: Number(tot?.n ?? 0), page, pageSize };
    },
  );

  /**
   * Ícone do item por TemplateID (só leitura do vendor, nunca commita asset). Público: `<img>` não manda o Bearer do admin.
   * Como lê esse código (cada variável): `tid` TemplateID da URL; `abs` arquivo resolvido; `buf` bytes servidos (png, ou jpg p/ cartas).
   */
  f.get<{ Params: { templateId: string } }>("/api/admin/item-icons/:templateId", async (req, reply) => {
    const tid = String(req.params.templateId).replace(/\.png$/i, "");
    if (!/^\d{1,10}$/.test(tid)) return reply.code(404).send({ message: "Não encontrado" });
    const abs = await resolveItemIcon(ctx, Number(tid));
    if (!abs || !existsSync(abs)) return reply.code(404).send({ message: "Não encontrado" });
    try {
      const buf = readFileSync(abs);
      return reply.type(/\.jpe?g$/i.test(abs) ? "image/jpeg" : "image/png").header("Cache-Control", "public, max-age=31536000, immutable").header("Content-Length", buf.length).send(buf);
    } catch {
      return reply.code(404).send({ message: "Não encontrado" });
    }
  });

  /**
   * Gera um ícone de item com IA (Recraft) a partir do nome/categoria/descrição atuais — devolve só uma prévia
   * (`previewUrl`, servida por `/uploads/...` como qualquer upload), nada é aceito no caminho real do ícone até
   * `POST .../icon/accept`. `b.prompt` troca o prompt default (ainda assim passa por `semAcento`/`buildIconPrompt`
   * se vazio); "Regenerar" no admin é só chamar de novo (o rascunho antigo fica órfão em `icon-drafts/`, sem custo
   * de limpar agora). Repo root calculado a partir do cwd do processo (`tsx watch` roda com cwd = apps/api).
   */
  const repoRoot = resolvePath(process.cwd(), "../..");
  f.post<{ Params: { templateId: string } }>("/api/admin/items/:templateId/icon/generate", { preHandler: guard }, async (req, reply) => {
    const tid = Number(req.params.templateId);
    if (!Number.isFinite(tid) || tid <= 0) return reply.code(400).send({ message: "templateId inválido" });
    const [raw] = await ctx.h.db
      .select({ TemplateID: gameTables.Shop_Goods.TemplateID, Name: gameTables.Shop_Goods.Name, CategoryID: gameTables.Shop_Goods.CategoryID, Pic: gameTables.Shop_Goods.Pic, NeedSex: gameTables.Shop_Goods.NeedSex, Description: gameTables.Shop_Goods.Description })
      .from(gameTables.Shop_Goods)
      .where(eq(gameTables.Shop_Goods.TemplateID, tid))
      .limit(1);
    if (!raw) return reply.code(404).send({ message: "Item não encontrado" });
    // Prompt a partir do nome/descrição em PT-BR (overlay), não do texto original do vendor (vietnamita/chinês).
    const [row] = await withItemOverlay(ctx, [raw as Row]);
    const b = (req.body ?? {}) as Row;
    const prompt = typeof b.prompt === "string" && b.prompt.trim() ? b.prompt.trim() : buildIconPrompt({ name: String(row?.Name ?? raw.Name ?? `#${tid}`), categoryId: raw.CategoryID, description: (row?.Description as string | null) ?? raw.Description });
    let apiKey: string;
    try {
      apiKey = recraftApiKey(repoRoot);
    } catch (e) {
      return reply.code(503).send({ message: (e as Error).message });
    }
    try {
      const gerado = await generateIconPng(apiKey, prompt);
      let amostraAbs: string | undefined;
      for (const rel of itemIconRel(raw.CategoryID, raw.Pic ?? "", raw.NeedSex)) {
        amostraAbs = ctx.resources.resolve(rel);
        if (amostraAbs) break;
      }
      const resized = await resizePng(gerado, iconSizeFor(amostraAbs));
      const draftKey = `icon-drafts/${tid}-${Date.now()}.png`;
      const asset = await ctx.storage.put(draftKey, resized, "image/png");
      if (ctx.storage.kind === "local" && ctx.storage.dir) ctx.resources.trees[0]?.add(asset.key, `${ctx.storage.dir}/${asset.key}`);
      await audit(ctx, actor(req), "items", `icon generate #${tid}`, { prompt });
      return { draftKey: asset.key, previewUrl: asset.url, prompt };
    } catch (e) {
      return reply.code(502).send({ message: `Falha ao gerar ícone: ${(e as Error).message}` });
    }
  });

  /**
   * Aceita um rascunho gerado por `.../icon/generate`: copia pro caminho real que o cliente espera
   * (`itemIconRel`, igual `resolveItemIcon`), nunca em `vendor/` — só no overlay de upload (`ctx.storage`/
   * `ctx.resources` como no handler de upload de assets). Limpa o cache de ícone e o rascunho depois.
   */
  f.post<{ Params: { templateId: string } }>("/api/admin/items/:templateId/icon/accept", { preHandler: guard }, async (req, reply) => {
    const tid = Number(req.params.templateId);
    const b = (req.body ?? {}) as Row;
    const draftKey = String(b.draftKey ?? "");
    if (!Number.isFinite(tid) || tid <= 0 || !draftKey.startsWith(`icon-drafts/${tid}-`)) return reply.code(400).send({ message: "draftKey inválido" });
    const [row] = await ctx.h.db
      .select({ CategoryID: gameTables.Shop_Goods.CategoryID, Pic: gameTables.Shop_Goods.Pic, NeedSex: gameTables.Shop_Goods.NeedSex })
      .from(gameTables.Shop_Goods)
      .where(eq(gameTables.Shop_Goods.TemplateID, tid))
      .limit(1);
    if (!row) return reply.code(404).send({ message: "Item não encontrado" });
    const finalRel = itemIconRel(row.CategoryID, row.Pic ?? "", row.NeedSex)[0];
    if (!finalRel) return reply.code(400).send({ message: "Categoria sem caminho de ícone conhecido (defina Pic antes)" });
    let bytes: Buffer;
    if (ctx.storage.kind === "local" && ctx.storage.dir) {
      const abs = ctx.resources.resolve(draftKey) ?? join(ctx.storage.dir, draftKey);
      if (!existsSync(abs)) return reply.code(404).send({ message: "Rascunho não encontrado (expirou?)" });
      bytes = readFileSync(abs);
    } else {
      const found = (await ctx.storage.list("icon-drafts")).find((a) => a.key === draftKey);
      if (!found) return reply.code(404).send({ message: "Rascunho não encontrado (expirou?)" });
      bytes = Buffer.from(await (await fetch(found.url)).arrayBuffer());
    }
    const asset = await ctx.storage.put(finalRel, bytes, "image/png");
    if (ctx.storage.kind === "local" && ctx.storage.dir) ctx.resources.trees[0]?.add(asset.key, `${ctx.storage.dir}/${asset.key}`);
    iconCache.delete(tid);
    try {
      await ctx.storage.remove(draftKey);
      ctx.resources.trees[0]?.remove(draftKey);
    } catch {
      // rascunho órfão não é grave, só sobra em icon-drafts/
    }
    await audit(ctx, actor(req), "items", `icon accept #${tid}`, { finalRel });
    return { ok: true, iconUrl: `/api/admin/item-icons/${tid}.png` };
  });

  /**
   * Prévia de mapa por `ID` (`game."Game_Map"`), só leitura: `image/map/<ID>/icon.png` (fallback `small.png`), como
   * o cliente resolve em `PathManager.as:136-156` (`solveMapIconPath` param2=0) / `:121-124` (`solveMapSmallView`).
   * Público como `item-icons` (o `<img>` não manda Bearer).
   * Como lê esse código (cada variável): `id` Game_Map.ID da URL; `abs` arquivo resolvido no overlay/vendor.
   */
  f.get<{ Params: { mapId: string } }>("/api/admin/map-icons/:mapId", async (req, reply) => {
    const id = String(req.params.mapId).replace(/\.png$/i, "");
    if (!/^\d{1,10}$/.test(id)) return reply.code(404).send({ message: "Não encontrado" });
    const abs = ctx.resources.resolve(`image/map/${id}/icon.png`) ?? ctx.resources.resolve(`image/map/${id}/small.png`);
    if (!abs || !existsSync(abs)) return reply.code(404).send({ message: "Não encontrado" });
    try {
      const buf = readFileSync(abs);
      return reply.type("image/png").header("Cache-Control", "public, max-age=31536000, immutable").header("Content-Length", buf.length).send(buf);
    } catch {
      return reply.code(404).send({ message: "Não encontrado" });
    }
  });

  /**
   * Instâncias visual editor (site-admin-redesign, editor #2): mission-chain diagnostics for one dungeon —
   * see `lib/pve-diagnostics.ts`'s file banner and `docs/guides/pve.md` §1.1 (task `pve-cadeia`) for why
   * this exists. Admin-only (constructs a real fight-engine game per difficulty — cheap, ~ms, but still a
   * real computation, not a static lookup, so it goes behind `guard` like any other admin-only read).
   */
  f.get<{ Params: { id: string } }>("/api/admin/dungeons/:id/diagnostics", { preHandler: guard }, async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ message: "id inválido" });
    return { items: await diagnosePve(ctx, id) };
  });

  f.get<{ Params: { resource: string; id: string } }>("/api/admin/:resource/:id", { preHandler: guard }, async (req, reply) => {
    const def = resolve(req.params.resource);
    const w = def && pkWhere(def, req.params.id);
    if (!def || !w) return reply.code(404).send({ message: "Não encontrado" });
    const [row] = await ctx.h.db.select().from(def.table).where(w).limit(1);
    if (!row) return reply.code(404).send({ message: "Não encontrado" });
    const item = strip(def, row as Row);
    return (await withOverlays(ctx, def, req.params.resource, [item]))[0];
  });

  const afterWrite = async (req: FastifyRequest, def: ResourceDef, what: string, data?: unknown) => {
    const files = await ctx.cache.invalidate([tableKey(def.table)]);
    // game-side caches (items/shop/maps + event templates + app."ScheduledEvents"/"PveBalance" + o canal local
    // em player."Server_List", ch-tabela: Room/Total/ZoneId/ZoneName só são lidos no boot/reload do apps/game):
    // reload no internal channel
    const key = tableKey(def.table);
    if (key.startsWith("game.") || key === "app.ScheduledEvents" || key === "app.PveBalance" || key === "player.Server_List") void gameInternalPost(ctx, "/reload-templates");
    await audit(ctx, actor(req), "crud", `${what} ${tableKey(def.table)}${files.length ? ` (rebuilt ${files.join(", ")})` : ""}`, data);
  };

  /**
   * Insere `values` em `def.table` (preenche colunas NOT NULL sem default/FieldDef, checa PK duplicada, invalida
   * cache + avisa o game) — cauda comum da criação genérica (`POST /api/admin/:resource`) e de criações "de atalho"
   * feitas a partir de outro resource (ex. "Adicionar à loja" a partir de um item cria uma linha em `game."Shop"`).
   */
  async function insertRow(req: FastifyRequest, def: ResourceDef, values: Row, reply: FastifyReply) {
    for (const [k, col] of Object.entries(cols(def.table))) {
      if (values[k] !== undefined || def.pk.includes(k) || !col.notNull || col.hasDefault) continue;
      values[k] = col.dataType === "boolean" ? false : col.dataType === "number" ? 0 : col.dataType === "string" ? "" : null;
    }
    const w = def.pk.every((k) => values[k] !== undefined && values[k] !== null) ? pkWhere(def, def.pk.map((k) => String(values[k])).join(ID_SEP)) : undefined;
    if (w) {
      const [dup] = await ctx.h.db.select().from(def.table).where(w).limit(1);
      if (dup) return reply.code(409).send({ message: `${def.pk.join(" + ")} já existe` });
    }
    try {
      const [row] = (await ctx.h.db.insert(def.table).values(values as never).returning()) as Row[];
      await afterWrite(req, def, "create", values);
      return reply.code(201).send(strip(def, row ?? values));
    } catch (e) {
      return reply.code(400).send({ message: (e as Error).message.split("\n")[0] });
    }
  }

  f.post<{ Params: { resource: string } }>("/api/admin/:resource", { preHandler: guard }, async (req, reply) => {
    const def = resolve(req.params.resource);
    if (!def) return reply.code(404).send({ message: "Recurso desconhecido" });
    if (def.readOnly || def.noCreate) return reply.code(405).send({ message: "Criação não permitida" });
    const values = pick(def, req.body as Row, { allowPk: true });
    // Editor de item: TemplateID em branco (ou 0/negativo) ganha o próximo livre na faixa 90000000-99999998, reservada
    // pra itens criados no admin (já usada por "Pacote de..." existentes) — fora da faixa do catálogo do vendor e
    // do sentinela de QA 999999999, pra não pular pra um ID gigante.
    if (req.params.resource === "items" && (values.TemplateID === null || values.TemplateID === undefined || Number(values.TemplateID) <= 0)) {
      const [next] = await q(
        ctx.h,
        sql`SELECT COALESCE(MAX("TemplateID"), 89999999) + 1 AS "nextId" FROM game."Shop_Goods" WHERE "TemplateID" >= 90000000 AND "TemplateID" < 99999999`,
      );
      values.TemplateID = Number(next?.nextId ?? 90000000);
    }
    return insertRow(req, def, values, reply);
  });

  /**
   * "Adicionar à loja" (botão da página Itens): cria uma linha em `game."Shop"` pro `TemplateID` da URL, com o
   * `ID` (heap sem PK real) gerado como `MAX(ID)+1` igual ao TemplateID de `items` acima. `insertRow` já invalida
   * o cache de `game."Shop"` e avisa o game (`afterWrite` -> `gameInternalPost(.../reload-templates)`) pelo
   * mesmo caminho da criação genérica do resource "shop".
   */
  f.post<{ Params: { templateId: string } }>("/api/admin/items/:templateId/add-to-shop", { preHandler: guard }, async (req, reply) => {
    const tid = Number(req.params.templateId);
    if (!Number.isFinite(tid) || tid <= 0) return reply.code(400).send({ message: "templateId inválido" });
    const [item] = await ctx.h.db.select({ TemplateID: gameTables.Shop_Goods.TemplateID }).from(gameTables.Shop_Goods).where(eq(gameTables.Shop_Goods.TemplateID, tid)).limit(1);
    if (!item) return reply.code(404).send({ message: "Item não encontrado" });
    const shopDef = RESOURCES.shop;
    if (!shopDef) return reply.code(503).send({ message: "Recurso 'shop' indisponível" });
    const values = pick(shopDef, (req.body as Row) ?? {}, { allowPk: true });
    values.TemplateID = tid;
    if (values.ID === null || values.ID === undefined || Number(values.ID) <= 0) {
      const [next] = await q(ctx.h, sql`SELECT COALESCE(MAX("ID"), 0) + 1 AS "nextId" FROM game."Shop"`);
      values.ID = Number(next?.nextId ?? 1);
    }
    return insertRow(req, shopDef, values, reply);
  });

  f.patch<{ Params: { resource: string; id: string } }>("/api/admin/:resource/:id", { preHandler: guard }, async (req, reply) => {
    const def = resolve(req.params.resource);
    const w = def && pkWhere(def, req.params.id);
    if (!def || !w) return reply.code(404).send({ message: "Não encontrado" });
    if (def.readOnly) return reply.code(405).send({ message: "Somente leitura" });
    // site-admin-redesign: translatable text fields (quests.Title, dungeons.Name, ...) never touch the raw
    // `game.*` column — they're pulled out here and upserted into `app."Translations"` below instead, so the
    // raw column stays the untouched vendor/donor source text (`<field>__original` in the GET response).
    const { translatable, rest } = splitTranslatable(def, { ...(req.body as Row) });
    const values = pick(def, rest, { allowPk: false });
    if (!Object.keys(values).length && !Object.keys(translatable).length) return reply.code(400).send({ message: "Nada para atualizar" });
    try {
      let rows: Row[];
      if (Object.keys(values).length) {
        rows = (await ctx.h.db.update(def.table).set(values as never).where(w).returning()) as Row[];
        if (!rows.length) return reply.code(404).send({ message: "Não encontrado" });
      } else {
        rows = (await ctx.h.db.select().from(def.table).where(w).limit(1)) as Row[];
        if (!rows.length) return reply.code(404).send({ message: "Não encontrado" });
      }
      if (Object.keys(translatable).length) await writeTranslations(ctx, def, req.params.id, translatable, rows[0]!);
      await afterWrite(req, def, `update ${req.params.id}`, { ...values, ...translatable });
      return (await withOverlays(ctx, def, req.params.resource, [strip(def, rows[0]!)]))[0];
    } catch (e) {
      return reply.code(400).send({ message: (e as Error).message.split("\n")[0] });
    }
  });

  f.delete<{ Params: { resource: string; id: string } }>("/api/admin/:resource/:id", { preHandler: guard }, async (req, reply) => {
    const def = resolve(req.params.resource);
    const w = def && pkWhere(def, req.params.id);
    if (!def || !w) return reply.code(404).send({ message: "Não encontrado" });
    if (def.readOnly || def.noDelete) return reply.code(405).send({ message: "Exclusão não permitida" });
    await ctx.h.db.delete(def.table).where(w);
    await afterWrite(req, def, `delete ${req.params.id}`);
    return reply.code(204).send();
  });
  void inArray;
}

/** Writes a system mail with optional gold/money and up to 5 item attachments (Sys_Users_Goods rows referenced by Annex1..5). */
export async function sendMail(
  ctx: AppCtx,
  userId: number,
  nick: string,
  title: string,
  content: string,
  o: { gold?: number; money?: number; giftToken?: number; items?: Row[] } = {},
) {
  const now = wallNow();
  const annex: (number | null)[] = [];
  for (const it of (o.items ?? []).slice(0, 5)) {
    const tid = Number(it.templateId ?? it.TemplateID);
    if (!tid) continue;
    const res = await q(
      ctx.h,
      sql`INSERT INTO player."Sys_Users_Goods" ("UserID","BagType","TemplateID","Place","Count","IsJudge","Color","IsExist","StrengthenLevel","AttackCompose","DefendCompose","LuckCompose","AgilityCompose","IsBinds","BeginDate","ValidDate","IsUsed")
          VALUES (0, 0, ${tid}, -1, ${Math.max(1, Number(it.count ?? 1))}, true, '', true, 0, 0, 0, 0, 0, true, ${now}, ${Number(it.validDays ?? 0)}, false) RETURNING "ItemID"`,
    );
    annex.push(Number(res[0]?.ItemID ?? 0) || null);
  }
  const a = (i: number) => (annex[i] ? String(annex[i]) : null);
  await ctx.h.db.execute(sql`INSERT INTO player."User_Messages"
    ("SenderID","Sender","ReceiverID","Receiver","Title","Content","SendTime","IsRead","IsDelR","IfDelS","IsDelete","Annex1","Annex2","Annex3","Annex4","Annex5","Gold","Money","GiftToken","IsExist","Type","ValidDate","SendDate","Remark")
    VALUES (0, 'GM', ${userId}, ${nick}, ${title}, ${content}, ${now}, false, false, false, false, ${a(0)}, ${a(1)}, ${a(2)}, ${a(3)}, ${a(4)}, ${o.gold ?? 0}, ${o.money ?? 0}, ${o.giftToken ?? 0}, true, ${annex.length || o.gold || o.money ? 51 : 52}, 720, ${now}, '')`);
}
