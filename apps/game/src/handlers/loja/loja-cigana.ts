/**
 * Aba no jogo (6600): Loja Cigana (`gypsyshop.swf`, `Flash_Project/DDT660/src/gypsyShop/`) — 278 MYSTERY_SHOP.
 * Sub-byte (`GypsyShopPackageType`, vendor/DDT-6600/Source/Game.Server/Game.Server.Packets/GypsyShopPackageType.cs):
 *   1 OPEN_INFO       (`sendRequestGypsyNPCState()`, sem params)  — push-only no C# original (sem handler de
 *                      entrada, `GypsyShopHandleMgr` não registra código 1 — exceção caiu no catch e nunca
 *                      respondeu nada); aqui também sem resposta, mesmo comportamento.
 *   2 PLAYER_INFO     (`sendGypsyRefreshItemList()`, sem params)  — carrega/rola os 8 slots do jogador
 *   3 BUY             (`sendGypsyBuy(id,isBind)`)                 — compra 1 slot (isBind sempre descartado,
 *                      igual ao C# original: `packet.ReadBoolean();` sem atribuição, `GypsyShopBuy.cs:15`)
 *   4 RARE_ITEM_INFO  (`sendGypsyRefreshRareList()`, sem params)  — lista rara (6 itens, só InfoID)
 *   5 REFRESH         (`sendGypsyManualRefreshItemList()`, sem params) — reroll manual pago em Honor
 *
 * C#: `GypsyShopBuy.cs`, `GypsyShopPlayerInfo.cs`, `GypsyShopRateItemInfo.cs`, `GypsyShopRefresh.cs` (todos
 * decompilados por completo) + `GypsyShopMgr.cs` (sorteio) + `PlayerActives.cs:1364-1487` (estado por
 * jogador/wire format exato dos pacotes 2/3). A tabela fonte (`MysteryShop`, `GypsyItemData`) não aparece nos
 * catalog.json extraídos em `research/6600/db` (banco não dumpado) — por isso `app."MysteryShopTemplate"`/
 * `app."GypsyShopState"` são aditivas (ver `packages/db/src/schema/app.ts`), não geradas pelo `game.ts`.
 *
 * Simplificações deliberadas (documentadas, sem exploit):
 *  - Abertura/fechamento por horário (`GameProperties.MysteryShopOpenTime`, `GypsyShopMgr.GypsyTimeCheck`) não
 *    é portado — a loja fica sempre aberta (sem infraestrutura de `GameProperties` configurável nesta tarefa;
 *    pior caso é a loja nunca "fechar", nunca pior que o original pro jogador).
 *  - Reset grátis por HORA (`RefreshMysteryShopByHour`, `GameProperties.MysteryShopFreshTime`) trocado por
 *    reset grátis 1x/DIA (`dayKey`, igual ao resto dos sistemas diários do servidor) — sem o `GameProperties`
 *    de horário customizável, diário é a granularidade consistente já usada em todo o resto do código.
 *  - `GetRateAward` (`GypsyShopMgr.cs:206-227`) usa `Enumerable.Max()` sobre a pool do `LableType` 1 — se a
 *    pool estiver vazia (0 linhas até o admin configurar, caso de hoje) o C# original JOGARIA EXCEÇÃO; aqui a
 *    rolagem simplesmente devolve 0 slots (loja vazia, sem crash) — fix de robustez, não mudança de regra.
 * Compra: cobra (Money ou Honor, `Unit` 1/2) e só credita o item DEPOIS de confirmar saldo — sem bypass de
 * custo, sem duplicar item (um slot só pode ser comprado 1x por rodada, `CanBuy` zera e persiste na mesma
 * transação antes do próximo pacote ser processado — sem janela de corrida porque o handler não faz nenhum
 * `await` entre o cheque de saldo e a baixa do slot).
 *
 * Como testar: apps/game/test/client-6600-m3-mystery-shop.test.ts.
 */
import { eq } from "drizzle-orm";
import { app } from "@ddt/db";
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";
import { dayKey } from "../../game/events.js";
import { give } from "../eventos/agendador.js";
import type { MysteryShopRow } from "../../db/templates.js";

interface GypsySlot { gypsyId: number; infoId: number; unit: number; price: number; num: number; canBuy: number }

const t = (ctx: ServerContext, k: string, fb: string) => { const v = ctx.lang.t(k); return v === k ? fb : v; };

async function loadState(ctx: ServerContext, p: GamePlayer): Promise<{ slots: GypsySlot[]; curRefreshedTimes: number; lastRefresh: Date | null }> {
  const [row] = await ctx.db.db.select().from(app.GypsyShopState).where(eq(app.GypsyShopState.UserID, p.id)).limit(1);
  return row ? { slots: (row.Slots as GypsySlot[]) ?? [], curRefreshedTimes: row.CurRefreshedTimes, lastRefresh: row.LastRefresh ?? null } : { slots: [], curRefreshedTimes: 0, lastRefresh: null };
}

async function saveState(ctx: ServerContext, p: GamePlayer, slots: GypsySlot[], curRefreshedTimes: number, lastRefresh: Date | null): Promise<void> {
  await ctx.db.db
    .insert(app.GypsyShopState)
    .values({ UserID: p.id, Slots: slots, CurRefreshedTimes: curRefreshedTimes, LastRefresh: lastRefresh })
    .onConflictDoUpdate({ target: app.GypsyShopState.UserID, set: { Slots: slots, CurRefreshedTimes: curRefreshedTimes, LastRefresh: lastRefresh } });
}

/** GypsyShopMgr.GetRateAward (GypsyShopMgr.cs:206-227): 1 sorteio ponderado por `Random` (sem Max() em pool vazia — ver nota de robustez no topo). */
function pickOne(pool: MysteryShopRow[]): MysteryShopRow | undefined {
  if (pool.length === 0) return undefined;
  const maxRandom = pool.reduce((m, r) => Math.max(m, r.Random), 0);
  const maxRound = Math.floor(Math.random() * Math.max(maxRandom, 1));
  const candidates = pool.filter((r) => r.Random >= maxRound);
  if (candidates.length === 0) return undefined;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** GypsyShopMgr.GetMysteryShop (GypsyShopMgr.cs:190-204): sorteia 1 por vez até ter 8 (ou a pool acabar). */
function rollSlots(ctx: ServerContext): GypsySlot[] {
  const pool = ctx.templates.mysteryShop.get(1) ?? [];
  const slots: GypsySlot[] = [];
  let guard = 0;
  while (slots.length < 8 && guard++ < 500) {
    const picked = pickOne(pool);
    if (!picked) break; // pool vazia — loja sem itens, sem crash (ver nota de robustez)
    slots.push({ gypsyId: picked.ID, infoId: picked.InfoID, unit: picked.Unit, price: picked.Price, num: picked.Num, canBuy: picked.CanBuy });
  }
  return slots;
}

function sendPlayerInfoPacket(p: GamePlayer, slots: GypsySlot[], curRefreshedTimes: number): void {
  const out = new GSPacket(278, p.id);
  out.writeByte(2);
  out.writeInt(curRefreshedTimes);
  out.writeInt(slots.length);
  for (const s of slots) { out.writeInt(s.gypsyId); out.writeInt(s.unit); out.writeInt(s.price); out.writeInt(s.num); out.writeInt(s.infoId); out.writeInt(s.canBuy); }
  p.send(out);
}

// ------------------------------------------------------------------ 2 PLAYER_INFO (sendGypsyRefreshItemList)
async function playerInfo(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const day = dayKey(ctx.now());
  let { slots, curRefreshedTimes, lastRefresh } = await loadState(ctx, p);
  // LoadGypsyItemDataFromDatabase (PlayerActives.cs:583-609): sem estado ou < 8 slots -> rola; aqui também o
  // reset grátis diário (simplificação do reset por hora, ver nota no topo).
  if (slots.length < 8 || !lastRefresh || dayKey(lastRefresh) !== day) {
    slots = rollSlots(ctx);
    curRefreshedTimes = 0; // ResetMysteryShop
    lastRefresh = ctx.now();
    await saveState(ctx, p, slots, curRefreshedTimes, lastRefresh);
  }
  sendPlayerInfoPacket(p, slots, curRefreshedTimes);
}

// ------------------------------------------------------------------ 3 BUY (sendGypsyBuy)
async function buy(ctx: ServerContext, p: GamePlayer, id: number): Promise<void> {
  const state = await loadState(ctx, p);
  const slot = state.slots.find((s) => s.gypsyId === id);
  const out = new GSPacket(278, p.id);
  out.writeByte(3);
  if (!slot) {
    p.sendMessage(0, t(ctx, "GypsyShopBuy.Fail", "Item não encontrado na Loja Cigana."));
    out.writeInt(id); out.writeBoolean(false); p.send(out);
    return;
  }
  if (slot.canBuy !== 1) {
    p.sendMessage(0, t(ctx, "GypsyShopBuy.OutOfDate", "Este item já foi comprado nesta rodada."));
    out.writeInt(id); out.writeBoolean(false); p.send(out);
    return;
  }
  const c = p.info;
  let flag = false;
  if (slot.unit === 1) {
    if (slot.price <= 0 || slot.price <= c.Money + c.MoneyLock) { if (slot.price > 0) p.removeMoney(slot.price); flag = true; }
  } else if (slot.unit === 2) {
    if (c.myHonor >= slot.price) flag = true;
  }
  if (flag) {
    await give(ctx, p, [{ templateId: slot.infoId, count: 1, validDate: slot.num, isBind: true }], "Loja Cigana");
    p.sendMessage(0, t(ctx, "GypsyShopBuy.Success", "Compra realizada na Loja Cigana."));
    slot.canBuy = 0;
    await saveState(ctx, p, state.slots, state.curRefreshedTimes, state.lastRefresh);
    if (slot.unit === 2) p.removeMyHonor(slot.price);
  } else if (slot.unit === 2) {
    p.sendMessage(0, t(ctx, "GypsyShopBuy.OutHornor", "Honra insuficiente."));
  }
  out.writeInt(id);
  out.writeBoolean(flag);
  if (flag) out.writeInt(slot.canBuy);
  p.send(out);
}

// ------------------------------------------------------------------ 4 RARE_ITEM_INFO (sendGypsyRefreshRareList)
function rareItemInfo(p: GamePlayer, ctx: ServerContext): void {
  const pool = ctx.templates.mysteryShop.get(2) ?? [];
  const rare = pool.slice(0, Math.min(6, pool.length)); // GypsyShopMgr.GetRateMysteryShop: os 6 primeiros, sem sorteio
  const out = new GSPacket(278, p.id);
  out.writeByte(4);
  out.writeInt(rare.length);
  for (const r of rare) out.writeInt(r.InfoID);
  p.send(out);
}

// ------------------------------------------------------------------ 5 REFRESH (sendGypsyManualRefreshItemList)
async function manualRefresh(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const { curRefreshedTimes } = await loadState(ctx, p);
  const cost = curRefreshedTimes * curRefreshedTimes * 30 + 500; // GypsyShopRefresh.cs:13
  if (p.info.myHonor >= cost) {
    const slots = rollSlots(ctx);
    const next = curRefreshedTimes + 1;
    await saveState(ctx, p, slots, next, ctx.now());
    p.removeMyHonor(cost);
    p.sendMessage(0, t(ctx, "GypsyShopRefresh.Success", "Loja Cigana atualizada."));
    sendPlayerInfoPacket(p, slots, next);
  } else {
    p.sendMessage(0, t(ctx, "GypsyShopRefresh.Fail", "Honra insuficiente para atualizar a Loja Cigana."));
  }
}

export function registerLojaCigana(r: HandlerRegistry): void {
  r.player(278, "MYSTERY_SHOP", (ctx, p, pkt) => {
    const sub = pkt.readByte();
    switch (sub) {
      case 2: return playerInfo(ctx, p);
      case 3: { const id = pkt.readInt(); pkt.readBoolean(); return buy(ctx, p, id); }
      case 4: return rareItemInfo(p, ctx);
      case 5: return manualRefresh(ctx, p);
      default: return; // 1 OPEN_INFO (push-only, sem handler de entrada no original) — sem resposta, igual ao C#
    }
  });
}
