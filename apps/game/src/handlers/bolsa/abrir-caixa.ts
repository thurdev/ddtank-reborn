/**
 * Aba no jogo: Bolsa — abrir uma caixa/pacote (categoria 11, Property1=6) pra ganhar item/moeda aleatório.
 * Pacote: 63 ITEM_OPENUP. Exporta também `createItemBox`/`BoxResult` — o sorteio em si, reusado por
 * `loja/bau-rapido-ouro.ts` (compra rápida de caixa de ouro) e por outros handlers fora da bolsa/loja
 * (eventos, atividades) que também abrem caixas de recompensa.
 * C#: `OpenUpArkHandler.cs` (handler), `ItemBoxMgr.CreateItemBox` (`Bussiness/Managers/ItemBoxMgr.cs:186`,
 * o sorteio: toda linha `IsSelect`, + UMA linha aleatória entre as não-selecionadas cujo `Random >= rand(max Random)`).
 * Como testar: `apps/game/test/formulas.test.ts` (`createItemBox`). Manual: Bolsa → abrir caixa.
 */
import { consortiaMgr } from "../../game/consortia-mgr.js";
import { GSPacket } from "@ddt/protocol";
import { ItemInfo, templateBagType } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ItemBoxRow, Templates } from "../../db/templates.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";

export interface BoxResult {
  gold: number; money: number; giftToken: number; medal: number; exp: number; honor: number; hardCurrency: number;
  items: { row: ItemBoxRow; count: number }[];
}

/**
 * ItemBoxMgr.CreateItemBox (Bussiness/Managers/ItemBoxMgr.cs:186): every IsSelect row, plus ONE random row among the
 * non-selected rows whose Random >= rand(max Random). Special template ids are currencies.
 */
export function createItemBox(rows: ItemBoxRow[] | undefined, rnd = Math.random): BoxResult | null {
  if (!rows?.length) return null;
  const r: BoxResult = { gold: 0, money: 0, giftToken: 0, medal: 0, exp: 0, honor: 0, hardCurrency: 0, items: [] };
  const picked = rows.filter((s) => s.IsSelect);
  const others = rows.filter((s) => !s.IsSelect);
  if (others.length) {
    const max = Math.max(...others.map((s) => s.Random));
    const round = Math.floor(rnd() * max);
    const pool = others.filter((s) => s.Random >= round);
    if (pool.length) picked.push(pool[Math.floor(rnd() * pool.length)]!);
  }
  for (const b of picked) {
    switch (b.TemplateId) {
      case -1100: r.giftToken += b.ItemCount; continue;
      case -900: r.hardCurrency += b.ItemCount; continue;
      case -800: r.honor += b.ItemCount; continue;
      case -300: r.medal += b.ItemCount; continue;
      case -200: r.money += b.ItemCount; continue;
      case -100: r.gold += b.ItemCount; continue;
      case 11107: r.exp += b.ItemCount; continue;
    }
    if (b.TemplateId < 0) continue; // -1000 league money, -1200 score, -1300 prestige: no column here
    r.items.push({ row: b, count: b.ItemCount });
  }
  return r;
}

/** OpenUpArkHandler.cs (63): byte bag, int slot, int count. */
export function openBox(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): void {
  const bag = p.getInventory(pkt.readByte());
  const slot = pkt.readInt();
  let num = pkt.readInt();
  const it = bag?.getItemAt(slot);
  if (!bag || !it || !it.isValidItem(ctx.now()) || it.template.CategoryID !== 11 || it.template.Property1 !== 6 || p.info.Grade < it.template.NeedLevel) return;
  if (num < 1 || num > it.Count) num = it.Count;
  const tpl: Templates = ctx.templates;
  const rows = tpl.itemBoxes.get(it.TemplateID);
  if (!rows?.length) return p.sendMessage(0, ctx.lang.t("OpenUpArkHandler.NoBox") === "OpenUpArkHandler.NoBox" ? "Esta caixa não tem itens." : ctx.lang.t("OpenUpArkHandler.NoBox"));
  const name = it.template.Name ?? "";
  if (!bag.removeCountFromStack(it, num)) return; // consume first (anti-dupe)
  const tot = { gold: 0, money: 0, giftToken: 0, medal: 0, exp: 0, honor: 0, hardCurrency: 0 };
  const merged = new Map<number, { row: ItemBoxRow; count: number }>();
  for (let i = 0; i < num; i++) {
    const r = createItemBox(rows, rnd);
    if (!r) continue;
    for (const k of Object.keys(tot) as (keyof typeof tot)[]) tot[k] += r[k];
    for (const x of r.items) {
      const m = merged.get(x.row.TemplateId);
      if (m) m.count += x.count;
      else merged.set(x.row.TemplateId, { row: x.row, count: x.count });
    }
  }
  p.beginChanges();
  let total = 0;
  let what = "";
  if (tot.money) { total += tot.money; what = ctx.lang.t("OpenUpArkHandler.Money"); p.addMoney(tot.money); }
  if (tot.gold) { total += tot.gold; what = ctx.lang.t("OpenUpArkHandler.Gold"); p.addGold(tot.gold); }
  if (tot.giftToken) { total += tot.giftToken; what = ctx.lang.t("OpenUpArkHandler.GiftToken"); p.addGiftToken(tot.giftToken); }
  if (tot.medal) { total += tot.medal; what = ctx.lang.t("OpenUpArkHandler.Medal"); p.addMedal(tot.medal, tpl.findItem); }
  if (tot.honor) { total += tot.honor; what = ctx.lang.t("OpenUpArkHandler.honor"); p.addHonor(tot.honor); }
  if (tot.hardCurrency) { total += tot.hardCurrency; what = ctx.lang.t("OpenUpArkHandler.hardCurrency"); p.addHardCurrency(tot.hardCurrency); }
  if (tot.exp) { total += tot.exp; what = ctx.lang.t("OpenUpArkHandler.Exp"); p.addGP(tot.exp, false); }
  p.commitChanges();
  if (total > 0) p.sendMessage(0, `${ctx.lang.t("OpenUpArkHandler.Start")}${total}${what}.`);
  if (merged.size) {
    const out = new GSPacket(63, p.id);
    out.writeString(name);
    out.writeByte(merged.size);
    for (const { row, count } of merged.values()) {
      out.writeInt(row.TemplateId); out.writeInt(count); out.writeBoolean(row.IsBind); out.writeInt(row.ItemValid);
      out.writeInt(row.StrengthenLevel); out.writeInt(row.AttackCompose); out.writeInt(row.DefendCompose);
      out.writeInt(row.AgilityCompose); out.writeInt(row.LuckCompose);
      const t = tpl.findItem(row.TemplateId);
      if (!t) continue;
      const make = (n: number) => {
        const x = ItemInfo.createFromTemplate(t, n, 101, ctx.now());
        x.IsBinds = row.IsBind; x.ValidDate = row.ItemValid; x.StrengthenLevel = row.StrengthenLevel;
        x.AttackCompose = row.AttackCompose; x.DefendCompose = row.DefendCompose; x.AgilityCompose = row.AgilityCompose; x.LuckCompose = row.LuckCompose;
        return x;
      };
      if (t.MaxCount < 2) for (let i = 0; i < count; i++) p.addTemplateToBag(make(1), templateBagType(t), 1);
      else p.addTemplateToBag(make(count), templateBagType(t), count);
    }
    p.send(out);
  }
  p.questInv?.onUsingItem(it.TemplateID); void consortiaMgr(ctx).then((c) => c.onUseItem(p, it.TemplateID, 1));
}

export function registerAbrirCaixa(r: HandlerRegistry): void {
  r.player(63, "ITEM_OPENUP", (ctx, p, pkt) => openBox(ctx, p, pkt));
}
