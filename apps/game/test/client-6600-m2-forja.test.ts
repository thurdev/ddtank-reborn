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

describe("78 ITEM_FUSION — client 6600 (layout de receita novo, sem crash — gap M3)", () => {
  it("lê [int fusionId, int count, boolean withoutComposeAttr] sem desalinhar e responde sem corpo", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(78, (x) => { x.writeInt(4242); x.writeInt(3); x.writeBoolean(true); });
    const r = await c.code(78, undefined, m);
    expect(r.pkt.offset).toBe(r.pkt.length); // ack vazio — fusionCompleteHandler (6600) não lê corpo nenhum
    c.close();
  });
});
