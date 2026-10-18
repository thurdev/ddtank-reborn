/**
 * Aba no jogo: "Roleta" / Caddy (caixa de presentes) — abrir um baú de 112019/190000 mostra um tabuleiro de
 * 18 cartas (`RouletteManager.as`/`RouletteView.as`/`surpriseRoulette`), vira carta por carta gastando chave
 * (custo crescente, até 8 vezes) e no fim move tudo pra bolsa real. Também cobre a bancada da Caddy (abrir
 * baú avulso direto, abrir todas as cartas de uma vez, vender tudo), o ranking "pior sorte" e a família
 * "Pedra da Sorte" do 6600 (m3-caddy-loteria, só client->server novos, mesma tela da Caddy).
 * Pacotes: 26 LOTTERY_OPEN_BOX, 27 LOTTERY_RANDOM_SELECT, 28 LOTTERY_FINISH, 45 CADDY_GET_BADLUCK,
 *   204 OPEN_ALL_CARDBOX, 232 CADDY_SELL_ALL_GOODS, 165 LUCKSTONE_CONFIG, 97 LUCKSTONE_RANK_LIMIT,
 *   211 CADDY_EXCHANGE_ALL, 215 CADDY_CONVERTED_ALL (6600 only, "Pedra da Sorte").
 * C#: `LotteryOpenBoxHandler.cs`, `LotteryRandomSelectHandler.cs`, `LotteryFinishBoxHandler.cs`,
 *   `RequestBadLuckHandler.cs`, `OpenAllCardBoxHandler.cs`, `CaddyClearAllHandler.cs`,
 *   `LuckStoneEnableHandler.cs` (165), `CaddyConvertedHandler.cs` (215) — 97/211 têm zero classe `Handle`
 *   no servidor 6600 decompilado (ver `m3-caddy-loteria` nos builders `Out.luckStone*`/funções abaixo).
 * Como testar: `apps/game/test/activities.test.ts` (`pickLotteryBoard`),
 *   `apps/game/test/client-6600-m3-caddy-loteria.test.ts`. Manual: `docs/features/eventos.md`.
 *
 * m3-caddy-loteria (2026-10-18): a família "Pedra da Sorte" (97/165/211/215) troca de ouro/cartas por uma
 * segunda moeda ("LuckStone") que NÃO existe em tabela nenhuma do `.bak` nem do schema atual, e cujo único
 * builder proativo do C# (`SendLuckStoneEnable`) sempre manda `isOpen=false` — o recurso é um gancho de UI
 * que o cliente 6600 ganhou mas o servidor original nunca abriu. Portar "de verdade" (inventar uma tabela de
 * LuckStone/taxas de câmbio) seria criar uma economia nova que não existe no original — em vez disso, os 4
 * códigos respondem exatamente como o original faria se alguém os disparasse (165/97 fechados, 211/215
 * no-op sem resposta), o suficiente pra tirar os 4 de MISSING sem inventar comportamento nem abrir uma
 * superfície de exploit nova.
 */
import { sql } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import { ItemInfo, templateBagType } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { ItemBoxRow } from "../../db/templates.js";
import { grantRewards, type Reward } from "../../game/events.js";
import { createItemBox } from "../bolsa/abrir-caixa.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import * as Out from "../../packets/out.js";

// ------------------------------------------------------------------ 26/27/28 tabuleiro de 18 cartas
/** GamePlayer.Lottery/LotteryID/LotteryItems/LotteryAwardList (in-memory, same as the original). */
interface LotteryState { lottery: number; lotteryId: number; items: ItemBoxRow[]; awards: ItemInfo[] }
const lotteryOf = new WeakMap<GamePlayer, LotteryState>();
function lottery(p: GamePlayer): LotteryState {
  let s = lotteryOf.get(p);
  if (!s) lotteryOf.set(p, (s = { lottery: -1, lotteryId: 0, items: [], awards: [] }));
  return s;
}

function resetLottery(p: GamePlayer): void {
  const s = lottery(p);
  s.lottery = -1; s.lotteryId = 0; s.items = []; s.awards = [];
}

/** ItemBoxMgr.FindLotteryItemBoxByRand: 18 distinct-by-(template,count) rows sampled without replacement. */
export function pickLotteryBoard(rows: ItemBoxRow[], rnd = Math.random): ItemBoxRow[] {
  const seen = new Set<string>();
  const dedup = rows.filter((r) => { const k = `${r.TemplateId}:${r.ItemCount}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const pick: ItemBoxRow[] = [];
  const left = [...dedup];
  for (let i = 0; i < 18; i++) {
    if (!left.length) { if (!dedup.length) break; pick.push(dedup[Math.floor(rnd() * dedup.length)]!); continue; }
    pick.push(left.splice(Math.floor(rnd() * left.length), 1)[0]!);
  }
  return pick;
}

function lotteryBoardPkt(lotteryId: number, items: ItemBoxRow[]): GSPacket {
  const p = new GSPacket(29);
  p.writeInt(lotteryId);
  for (let i = 0; i < 18; i++) {
    const it = items[i];
    p.writeInt(it?.TemplateId ?? 0); p.writeBoolean(it?.IsBind ?? true); p.writeByte(it?.ItemCount ?? 0); p.writeByte(it?.ItemValid ?? 0);
  }
  return p;
}

function caddyAwardsPkt(items: ItemInfo[], name: string): GSPacket {
  const p = new GSPacket(245);
  p.writeBoolean(items.length > 0);
  p.writeInt(items.length);
  for (const it of items) { p.writeString(name); p.writeInt(it.TemplateID); p.writeInt(4); p.writeBoolean(false); }
  return p;
}

/** 26 LOTTERY_OPEN_BOX: byte bagType, int slot, int num. num=-1 -> open the "god of wealth" 18-slot board (item at slot
 *  must be 112019/190000); else num is the templateId of a chest to open directly (ItemBoxMgr.CreateItemBox). */
export async function lotteryOpenBox(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const s = lottery(p);
  if (s.lottery !== -1) return p.sendMessage(0, "O baú já está ativo!");
  const bagType = pkt.readByte();
  const slot = pkt.readInt();
  const idNum = pkt.readInt();
  const bag = p.getInventory(bagType);
  if (idNum === -1) {
    const it = bag?.getItemAt(slot);
    if (!it || (it.TemplateID !== 112019 && it.TemplateID !== 190000)) return;
    const rows = pickLotteryBoard(ctx.templates.itemBoxes.get(it.TemplateID) ?? [], Math.random);
    if (!bag!.removeCountFromStack(it, 1)) return;
    s.lottery = 0; s.lotteryId = it.TemplateID; s.items = rows;
    return p.send(lotteryBoardPkt(it.TemplateID, rows));
  }
  const dest = bag ?? p.caddyBag;
  if (dest.findFirstEmptySlot() === -1) { p.sendMessage(0, "O baú está cheio, não é possível abrir mais!"); return void p.send(caddyAwardsPkt(p.caddyBag.getItems(), "")); }
  const chest = [...p.allBags()].map((b) => b.getItemByTemplateID(0, idNum)).find((x) => x);
  if (!chest || chest.Count < 1) return void p.send(caddyAwardsPkt(p.caddyBag.getItems(), ""));
  const special = idNum === 112047 || idNum === 112100 || idNum === 112101;
  if (special) {
    const key = p.propBag.getItemByTemplateID(0, 11456);
    if (!key || key.Count < 4) { p.sendMessage(0, `${key?.template.Name ?? "Chave"} insuficiente.`); return void p.send(caddyAwardsPkt(p.caddyBag.getItems(), "")); }
    p.propBag.removeTemplate(11456, 4);
    await bumpCaddyOpenCount(ctx, p);
  }
  const r = createItemBox(ctx.templates.itemBoxes.get(idNum));
  if (!r) return void p.send(caddyAwardsPkt(p.caddyBag.getItems(), ""));
  let name = "";
  const rewards: Reward[] = [];
  if (r.gold) p.addGold(r.gold);
  if (r.giftToken) p.addGiftToken(r.giftToken);
  for (const x of r.items) { rewards.push({ templateId: x.row.TemplateId, count: x.count, validDate: x.row.ItemValid, isBind: x.row.IsBind }); name = ctx.templates.findItem(x.row.TemplateId)?.Name ?? name; }
  for (const b of p.allBags()) if (b.removeTemplate(idNum, 1)) break;
  const g = grantRewards(p, rewards, ctx.templates.findItem, ctx.now());
  if (g.overflow.length) await mailItems(ctx, p, g.overflow, "Abrir baú", 8);
  s.lottery = -1;
  p.send(caddyAwardsPkt(p.caddyBag.getItems(), name));
  if (g.summary.length) p.sendMessage(0, `Você recebeu ${g.summary.join(", ")}.`);
}

/** Sys_Users_Extra.TotalCaddyOpen (UsersExtraInfo.AddBadLuckCaddy): atomic SQL increment, offline-safe. */
async function bumpCaddyOpenCount(ctx: ServerContext, p: GamePlayer): Promise<void> {
  await ctx.db.db.execute(sql`INSERT INTO player."Sys_Users_Extra" ("UserID","TotalCaddyOpen") VALUES (${p.id}, 1)
    ON CONFLICT ("UserID") DO UPDATE SET "TotalCaddyOpen" = "Sys_Users_Extra"."TotalCaddyOpen" + 1`);
  if (p.extra) (p.extra as unknown as { TotalCaddyOpen: number }).TotalCaddyOpen = ((p.extra as unknown as { TotalCaddyOpen: number }).TotalCaddyOpen ?? 0) + 1;
}

/** 27 LOTTERY_RANDOM_SELECT: draw 1 card from the 18-board, max 8 draws, draw n costs n keys (escalating, as original). */
export async function lotteryRandomSelect(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const s = lottery(p);
  if (s.lottery < 0 || s.lotteryId <= 0) return p.sendMessage(0, "Você ainda não abriu o baú.");
  if (s.lottery >= 8) return p.sendMessage(0, "Você não tem mais aberturas de baú.");
  const keyId = s.lotteryId === 190000 ? 190001 : 11444;
  const have = p.propBag.getItemByTemplateID(0, keyId)?.Count ?? 0;
  if (have < s.lottery + 1) return p.sendMessage(0, "Chaves insuficientes para abrir o baú.");
  s.lottery++;
  const r = createItemBox(s.items);
  if (!r || !r.items.length) return p.sendMessage(0, "Erro ao obter os dados da recompensa.");
  const picked = r.items[0]!;
  const idx = s.items.findIndex((x) => x.TemplateId === picked.row.TemplateId && x.ItemCount === picked.count);
  if (idx >= 0) s.items.splice(idx, 1);
  const tpl = ctx.templates.findItem(picked.row.TemplateId);
  const it = ItemInfo.createFromTemplate(tpl ?? ({ TemplateID: picked.row.TemplateId, MaxCount: 1 } as never), picked.count, 105, ctx.now());
  it.IsBinds = picked.row.IsBind; it.ValidDate = picked.row.ItemValid;
  s.awards.push(it);
  p.propBag.removeTemplate(keyId, s.lottery);
  const out = new GSPacket(30);
  out.writeBoolean(true); out.writeInt(it.TemplateID); out.writeInt(tpl?.Quality ?? 0); out.writeInt(0);
  out.writeInt(0); out.writeInt(0); out.writeInt(0); out.writeInt(0); out.writeBoolean(it.IsBinds); out.writeInt(it.ValidDate); out.writeByte(it.Count);
  p.send(out);
}

/** 28 LOTTERY_FINISH: move CaddyBag + LotteryAwardList into real bags (overflow by mail), ResetLottery. */
export async function lotteryFinish(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const s = lottery(p);
  const overflow: ItemInfo[] = [];
  for (const it of [...p.caddyBag.getItems()]) {
    p.caddyBag.removeItem(it);
    if (!p.addTemplateToBag(it, templateBagType(it.template), it.Count)) overflow.push(it);
  }
  if (s.lottery !== -1 && s.awards.length) {
    for (const it of s.awards) if (!p.addTemplateToBag(it, templateBagType(it.template), it.Count)) overflow.push(it);
  }
  if (overflow.length) await mailItems(ctx, p, overflow, "Mochila cheia, itens enviados por correio", 8);
  resetLottery(p);
}

// ------------------------------------------------------------------ 45/204/232 bancada da Caddy
/** 45 CADDY_GET_BADLUCK: WorldMgr.CaddyRank — top 20 by Sys_Users_Extra.TotalCaddyOpen. */
export async function caddyBadLuck(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const res = (await ctx.db.db.execute(sql`
    SELECT d."UserID" AS id, d."NickName" AS nick, COALESCE(e."TotalCaddyOpen",0) AS n
    FROM player."Sys_Users_Detail" d LEFT JOIN player."Sys_Users_Extra" e ON e."UserID" = d."UserID"
    WHERE COALESCE(e."TotalCaddyOpen",0) > 0 ORDER BY n DESC LIMIT 20`)) as unknown;
  const rows = (Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? [])) as { id: number; nick: string; n: number }[];
  const out = new GSPacket(45);
  out.writeString(ctx.now().toISOString());
  out.writeInt(rows.length);
  rows.forEach((r, i) => { out.writeInt(i + 1); out.writeInt(r.id); out.writeInt(Number(r.n)); out.writeInt(0); out.writeString(r.nick ?? ""); });
  p.send(out);
}

/** 204 OPEN_ALL_CARDBOX: every CaddyBag item -> CardBag.AddCard(Property5, rand 1..2). */
export function openAllCardBox(p: GamePlayer): void {
  for (const it of [...p.caddyBag.getItems()]) {
    p.caddyBag.removeItem(it);
    const n = 1 + Math.floor(Math.random() * 2);
    p.cardBag.addCard(it.template.Property5, n);
    p.sendMessage(0, `Você abriu ${it.template.Name} e recebeu ${n} carta(s).`);
  }
}

/** 232 (CaddyClearAllHandler, confusingly ePackageType-unnamed "CADDY_SELL_ALL_GOODS" client-side): reclaim every
 *  CaddyBag item for gold/giftToken (Item.ReclaimType 1 = gold, 2 = giftToken) and clear the bag. */
export function caddySellAll(p: GamePlayer): void {
  let gold = 0, giftToken = 0;
  for (const it of [...p.caddyBag.getItems()]) {
    if (it.template.ReclaimType === 1) gold += it.template.ReclaimValue * it.Count;
    else if (it.template.ReclaimType === 2) giftToken += it.template.ReclaimValue * it.Count;
    p.caddyBag.removeItem(it);
  }
  p.beginChanges();
  if (gold) p.addGold(gold);
  if (giftToken) p.addGiftToken(giftToken);
  p.commitChanges();
  const msg = [gold ? `Você recebeu ${gold} de ouro` : "", giftToken ? `Você recebeu ${giftToken} Cupons` : ""].filter(Boolean).join(" ");
  if (msg) p.sendMessage(0, msg);
}

// ------------------------------------------------------------------ 97/165/211/215 "Pedra da Sorte" (6600)
/** 165 LUCKSTONE_CONFIG: `requestForLuckStone()` sends zero fields; always closed, see `Out.luckStoneConfigClosed`. */
export function luckStoneConfig(ctx: ServerContext, p: GamePlayer): void {
  p.send(Out.luckStoneConfigClosed(ctx.now()));
}

/** 97 LUCKSTONE_RANK_LIMIT: `sendQequestLuckky(isOpen=false)` sends 1 bool the original never reads back (no
 *  `PacketHandler(97)` exists) — always closed/empty, see `Out.luckStoneRankLimitClosed`. */
export function luckStoneRankLimit(_ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  pkt.readBoolean(); // isOpen (unused by the original — no server handler ever read it either)
  p.send(Out.luckStoneRankLimitClosed());
}

/** 211 CADDY_EXCHANGE_ALL: `sendExchange()` sends zero fields. No `PacketHandler(211)` class exists in the
 *  decompiled 6600 server (confirmed by grep across `Game.Server.Packets.Client`) — dead wire, no reply. */
export function caddyExchangeAll(ctx: ServerContext, p: GamePlayer): void {
  ctx.log.debug(`211 CADDY_EXCHANGE_ALL: noop (player=${p.id})`);
}

/** 215 CADDY_CONVERTED_ALL: `CaddyConvertedHandler.cs` (6600) reads 3 fields and returns 0 without ever
 *  writing a reply — ported verbatim (dead feature, same "exchange lottery score" flow as 211 above, wired
 *  client-side but never finished server-side). */
export function caddyConvertedAll(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const isConver = pkt.readBoolean();
  const totalScore = pkt.readInt();
  const lotteryScore = pkt.readInt();
  ctx.log.debug(`215 CADDY_CONVERTED_ALL: noop (player=${p.id}, isConver=${isConver}, totalScore=${totalScore}, lotteryScore=${lotteryScore})`);
}
