/**
 * M2 `m2-forja` (docs/plan/TASKS.md, research/6600/packets-m1.md "M2 forja"): fortalecer (59), transferir
 * (61) e fundir (78) pro cliente 6600. Mesmo método dos Rounds anteriores: monta o pacote EXATO que o AS3
 * de cada `clientKind` manda (campo a campo, confirmado contra `GameSocketOut.as`/o `.cs` real do 6600
 * quando existe decompilado), roda pelo handler de verdade via `FakeClient`, e confere o efeito/resposta.
 *
 * 59 ITEM_STRENGTHEN no 6600 não é um layout novo do MESMO mecanismo — é um sistema diferente
 * (`ItemStrengthenHandler.cs` do 6600): sem sorteio (acumula EXP contra limiar, igual ao Evolução),
 * bancada `StoreBag[0]`=pedra / `StoreBag[1]`=equipamento (não mais slot 5 + 0-4), nível máximo rígido 12.
 * A tabela `game."StrengThenExp"` não é semeada no banco de teste (fora de `SEED_TABLES` em `helpers.ts`,
 * igual ao bloco NECKLACE_STRENGTH de `persist-all.test.ts`) — os testes aqui injetam as linhas direto em
 * `server.ctx.templates.strengthenExp`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

function strengthEquip() {
  const tpl = server.ctx.templates;
  return [...tpl.items.values()].find((t) => t.CanStrengthen && t.CategoryID < 18 && t.CategoryID !== 11)!;
}
const STONE_TEMPLATE_ID = 11024; // Pedra de Fortalecimento 5 (CategoryID 11, Property1 2) — ver forge-persist.test.ts

function seedStrengthenExp(fromLevel: number, toLevel: number, thresholds: Record<number, number>): void {
  const tpl = server.ctx.templates;
  for (let level = fromLevel; level <= toLevel; level++) {
    tpl.strengthenExp.set(level, { ID: 900000 + level, Level: level, Exp: thresholds[level] ?? 0, NecklaceStrengthExp: 0, NecklaceStrengthPlus: 0 });
  }
}

describe("59 ITEM_STRENGTHEN — client 6600 (sistema determinístico, research/6600/packets-m1.md M2 forja)", () => {
  it("sobe de nível quando a EXP acumulada cruza o limiar (StoreBag[0]=pedra, [1]=equipamento)", async () => {
    const stoneTpl = server.ctx.templates.findItem(STONE_TEMPLATE_ID)!;
    const perStoneExp = Math.max(10, stoneTpl.Property2); // ItemStrengthenHandler.cs: Property2 < 10 ? 10 : Property2
    seedStrengthenExp(0, 13, { 1: perStoneExp }); // limiar exatamente igual à EXP de 1 pedra -> sobra 0
    const equipT = strengthEquip();
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    const pl = p();
    const stone = ItemInfo.createFromTemplate(stoneTpl, 1, 101);
    const equip = ItemInfo.createFromTemplate(equipT, 1, 101);
    equip.StrengthenLevel = 0; equip.StrengthenExp = 0;
    pl.storeBag.addItemTo(stone, 0);
    pl.storeBag.addItemTo(equip, 1);
    const m = c.mark();
    c.out(59, (x) => { x.writeBoolean(false); x.writeBoolean(false); }); // consortiaState=false, isAllInject=false
    const r = await c.code(59, undefined, m);
    expect(r.pkt.readByte()).toBe(1); // upou
    expect(r.pkt.readBoolean()).toBe(false);
    expect(r.pkt.offset).toBe(r.pkt.length); // offset === length — sem sobra, sem EOF
    const equipAfter = pl.storeBag.getItemAt(1)!;
    expect(equipAfter.StrengthenLevel).toBe(1);
    expect(equipAfter.StrengthenExp).toBe(0);
    expect(pl.storeBag.getItemAt(0)).toBeNull(); // 1 pedra consumida (stack de 1 some)
    c.close();
  });

  it("não upa ainda escreve [byte 0, boolean false] (fix de EOF — C# original omite o byte na falha)", async () => {
    seedStrengthenExp(0, 13, { 1: 10_000 }); // limiar inalcançável com 1 pedra
    const equipT = strengthEquip();
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    const pl = p();
    const stone = ItemInfo.createFromTemplate(server.ctx.templates.findItem(STONE_TEMPLATE_ID)!, 1, 101);
    const equip = ItemInfo.createFromTemplate(equipT, 1, 101);
    equip.StrengthenLevel = 0; equip.StrengthenExp = 0;
    pl.storeBag.addItemTo(stone, 0);
    pl.storeBag.addItemTo(equip, 1);
    const m = c.mark();
    c.out(59, (x) => { x.writeBoolean(false); x.writeBoolean(false); });
    const r = await c.code(59, undefined, m);
    expect(r.pkt.readByte()).toBe(0);
    expect(r.pkt.readBoolean()).toBe(false);
    expect(r.pkt.offset).toBe(r.pkt.length);
    const equipAfter = pl.storeBag.getItemAt(1)!;
    expect(equipAfter.StrengthenLevel).toBe(0);
    expect(equipAfter.StrengthenExp).toBeGreaterThan(0);
    c.close();
  });

  it("isAllInject=true consome várias pedras da pilha de uma vez até upar (ou até a pilha acabar)", async () => {
    const stoneTpl = server.ctx.templates.findItem(STONE_TEMPLATE_ID)!;
    const perStoneExp = Math.max(10, stoneTpl.Property2);
    seedStrengthenExp(0, 13, { 1: perStoneExp * 5 - Math.floor(perStoneExp / 2) }); // precisa de ~5 pedras pra fechar
    const equipT = strengthEquip();
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    const pl = p();
    const stone = ItemInfo.createFromTemplate(stoneTpl, 20, 101); // pilha grande o bastante
    const equip = ItemInfo.createFromTemplate(equipT, 1, 101);
    equip.StrengthenLevel = 0; equip.StrengthenExp = 0;
    pl.storeBag.addItemTo(stone, 0);
    pl.storeBag.addItemTo(equip, 1);
    const stoneCountBefore = stone.Count;
    const m = c.mark();
    c.out(59, (x) => { x.writeBoolean(false); x.writeBoolean(true); }); // isAllInject=true
    const r = await c.code(59, undefined, m);
    expect(r.pkt.readByte()).toBe(1);
    r.pkt.readBoolean();
    expect(pl.storeBag.getItemAt(1)!.StrengthenLevel).toBe(1);
    const stoneAfter = pl.storeBag.getItemAt(0);
    // consumiu mais de 1 unidade (ceil(100/perStoneExp) > 1), mas não necessariamente a pilha inteira
    const consumed = stoneCountBefore - (stoneAfter?.Count ?? 0);
    expect(consumed).toBeGreaterThan(1);
    expect(consumed).toBeLessThanOrEqual(stoneCountBefore);
    c.close();
  });

  it("nível 12 (STHRENTH_MAX): bloqueia sem mandar pacote nenhum", async () => {
    seedStrengthenExp(0, 13, { 13: 10 });
    const equipT = strengthEquip();
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    const pl = p();
    const stone = ItemInfo.createFromTemplate(server.ctx.templates.findItem(STONE_TEMPLATE_ID)!, 5, 101);
    const equip = ItemInfo.createFromTemplate(equipT, 1, 101);
    equip.StrengthenLevel = 12; // já no máximo
    pl.storeBag.addItemTo(stone, 0);
    pl.storeBag.addItemTo(equip, 1);
    const m = c.mark();
    c.out(59, (x) => { x.writeBoolean(false); x.writeBoolean(false); });
    await new Promise((res) => setTimeout(res, 200));
    expect(c.received.slice(m).some((r) => r.code === 59)).toBe(false); // sem resposta — igual ao C# original (return antes de qualquer WriteTCP)
    expect(pl.storeBag.getItemAt(1)!.StrengthenLevel).toBe(12); // nada mudou
    c.close();
  });
});

describe("61 ITEM_TRANSFER — client 6600 (+4 int de bagType/place, research/6600/packets-m1.md M2 forja)", () => {
  it("StoreBag[0]/[1] (defaults do AS3) continua funcionando igual à 4.1 com os 4 ints extras", async () => {
    const tpl = server.ctx.templates;
    const hats = [...tpl.items.values()].filter((t) => t.CategoryID === 1 && t.CanStrengthen && t.CanCompose).slice(0, 2);
    expect(hats.length).toBe(2);
    const { c, player: p } = await loggedIn(server, { client: "6600", gold: 1_000_000 });
    const pl = p();
    const a = ItemInfo.createFromTemplate(hats[0]!, 1, 101); a.StrengthenLevel = 5;
    const b = ItemInfo.createFromTemplate(hats[1]!, 1, 101);
    pl.storeBag.addItemTo(a, 0);
    pl.storeBag.addItemTo(b, 1);
    const goldBefore = pl.info.Gold;
    const m = c.mark();
    c.out(61, (x) => {
      x.writeBoolean(true); x.writeBoolean(true); // moveHole, moveFiveSixHole
      x.writeInt(12); x.writeInt(0); // sBagType=StoreBag, sPlace=0 — default do sendItemTransfer do 6600
      x.writeInt(12); x.writeInt(1); // tBagType=StoreBag, tPlace=1
    });
    const r = await c.code(61, undefined, m);
    expect(r.pkt.readByte()).toBe(0);
    expect(r.pkt.offset).toBe(r.pkt.length);
    expect(pl.storeBag.getItemAt(0)!.StrengthenLevel).toBe(0);
    expect(pl.storeBag.getItemAt(1)!.StrengthenLevel).toBe(5);
    expect(pl.info.Gold).toBe(goldBefore - 10_000); // default MustTransferGold (cfgInt sem linha no Server_Config)
    c.close();
  });
});

describe("78 ITEM_FUSION — client 6600 (fusão por receita, research/6600/packets-m1.md M2 forja + m3-fusao)", () => {
  // FusionID 1 real do 6600 (vendor/_dbexport/Project_Game6600/data/Item_Fusion.json): 4x "Đá Chu Tước 1"
  // (TemplateID 11001, CategoryID 11 -> PropBag) funde em 1 "Đá Chu Tước 2" (11002), FusionRate 100000 = 100%.
  // Ambos TemplateIDs já existem no nosso game."Shop_Goods" (itens compartilhados com a 4.1).
  function seedRecipe(fusionId: number, item1: number, count1: number, fusionRate: number, reward: number, fusionType = 5) {
    server.ctx.templates.fusions6600.set(fusionId, {
      FusionID: fusionId, Item1: item1, Item2: -1, Item3: -1, Item4: -1,
      Count1: count1, Count2: 0, Count3: 0, Count4: 0, Formula: 0, FusionRate: fusionRate, FusionType: fusionType, Reward: reward,
    });
  }

  it("sucesso (FusionRate 100%): consome ouro + material, entrega count unidades do Reward", async () => {
    seedRecipe(1, 11001, 4, 100_000, 11002);
    const { c, player: p } = await loggedIn(server, { client: "6600", gold: 1_000_000 });
    const pl = p();
    pl.propBag.addItem(ItemInfo.createFromTemplate(server.ctx.templates.findItem(11001)!, 12, 101)); // 3 tentativas x Count1=4
    const goldBefore = pl.info.Gold;
    const m = c.mark();
    c.out(78, (x) => { x.writeInt(1); x.writeInt(3); x.writeBoolean(false); }); // fusionId=1, count=3, withoutComposeAttr=false
    const r = await c.code(78, undefined, m);
    expect(r.pkt.readBoolean()).toBe(true);
    expect(r.pkt.offset).toBe(r.pkt.length); // só 1 boolean no corpo (AbstractPacketLib.cs SendFusionResult)
    expect(pl.propBag.getItemCount(11001)).toBe(0); // 12 unidades consumidas (Count1=4 x count=3)
    expect(pl.propBag.getItemCount(11002)).toBe(3); // 3 sucessos (FusionRate 100%)
    expect(pl.info.Gold).toBe(goldBefore - 400 * 4 * 3); // MustFusionGold (default 400) * Count1 * count
    c.close();
  });

  it("falha (FusionRate 0%): ainda consome ouro + material, mas não entrega o Reward", async () => {
    seedRecipe(9999, 11003, 4, 0, 11004);
    const { c, player: p } = await loggedIn(server, { client: "6600", gold: 1_000_000 });
    const pl = p();
    pl.propBag.addItem(ItemInfo.createFromTemplate(server.ctx.templates.findItem(11003)!, 8, 101)); // 2 tentativas x Count1=4
    const goldBefore = pl.info.Gold;
    const m = c.mark();
    c.out(78, (x) => { x.writeInt(9999); x.writeInt(2); x.writeBoolean(false); });
    const r = await c.code(78, undefined, m);
    expect(r.pkt.readBoolean()).toBe(false);
    expect(r.pkt.offset).toBe(r.pkt.length);
    expect(pl.propBag.getItemCount(11003)).toBe(0); // material gasto mesmo sem sucesso (ItemFusionHandler.cs: RemoveTemplate antes do loop de sorteio)
    expect(pl.propBag.getItemCount(11004)).toBe(0); // nenhum sucesso
    expect(pl.info.Gold).toBe(goldBefore - 400 * 4 * 2);
    c.close();
  });

  it("receita inexistente: NoCondition, sem gastar nada", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", gold: 1_000 });
    const pl = p();
    const goldBefore = pl.info.Gold;
    const m = c.mark();
    c.out(78, (x) => { x.writeInt(777_777); x.writeInt(1); x.writeBoolean(false); }); // fusionId que não existe em fusions6600
    await new Promise((res) => setTimeout(res, 200));
    expect(c.received.slice(m).some((r) => r.code === 78)).toBe(false); // sem GSPacket(78) — igual ao C# original (return antes do SendFusionResult)
    expect(pl.info.Gold).toBe(goldBefore);
    c.close();
  });
});
