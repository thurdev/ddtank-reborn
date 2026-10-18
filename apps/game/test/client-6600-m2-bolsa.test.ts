/**
 * M2 `m2-bolsa` (docs/plan/TASKS.md, research/6600/packets-m1.md "M2 bolsa"): bag/equip/dress + família
 * MARRY_* pro cliente 6600. Mesmo método dos Rounds anteriores (`client-6600*.test.ts`): monta o pacote
 * EXATO que o AS3 de cada `clientKind` manda (campo a campo, confirmado contra `GameSocketOut.as`/o `.cs`
 * real quando existe), roda pelo handler de verdade via `FakeClient`, e lê a resposta na ordem exata do
 * reader AS3 citado no research doc — `offset === length` no final (sem EOF, sem sobra).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GSPacket } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
import { ItemInfo, type ItemTemplate } from "../src/game/item.js";
import type { ItemBoxRow } from "../src/db/templates.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

function readDate(p: GSPacket): void {
  p.readDateTime(true);
}
function expectFullyConsumed(p: GSPacket): void {
  expect(p.offset).toBe(p.length);
}

const tpl = (o: Partial<ItemTemplate>): ItemTemplate => ({
  TemplateID: 1, CategoryID: 7, Attack: 0, Defence: 0, Agility: 0, Luck: 0, Property1: 0, Property2: 0, Property3: 0, Property4: 0,
  Property5: 0, Property6: 0, Property7: 0, Property8: 0, Hole: "", MaxCount: 1, Level: 3, ...o,
}) as ItemTemplate;

// ---------------------------------------------------------------------------------------- 119 LINKREQUEST_GOODS
describe.each([["41"], ["6600"]] as const)("119 LINKREQUEST_GOODS — client %s (comparar-item.ts)", (clientKind) => {
  it("request shape (4.1: int+string+int; 6600: int+string+string) + response tail (dano mágico stub)", async () => {
    const t = server.ctx.templates.findItem(11101)!;
    const { c, player: p } = await loggedIn(server, { client: clientKind });
    const it = ItemInfo.createFromTemplate(t, 1, 0, server.ctx.now());
    it.IsBinds = false;
    expect(p().propBag.addItem(it)).toBe(true);
    await p().saveIntoDatabase(server.ctx.db.db); // loadItemById (119) lê da tabela, não da bolsa em memória
    const itemId = it.ItemID;
    expect(itemId).toBeGreaterThan(0);

    c.out(119, (o) => {
      o.writeInt(0); // num (não 4/5 -> caminho padrão de comparação)
      if (clientKind === "6600") {
        o.writeUTF("guid-de-chat"); // key — descartado
        o.writeUTF(String(itemId)); // templeteIDorItemID — o C# 6600 usa este (Convert.ToInt32)
      } else {
        o.writeUTF(""); // nickname param — descartado, igual ao original
        o.writeInt(itemId);
      }
    });
    const r = await c.code(119);
    const pkt = r.pkt;
    expect(pkt.readInt()).toBe(0); // num ecoado
    pkt.readString(); // nickName
    expect(pkt.readInt()).toBe(it.TemplateID);
    expect(pkt.readInt()).toBe(it.ItemID);
    pkt.readInt(); // StrengthenLevel
    pkt.readInt(); pkt.readInt(); pkt.readInt(); pkt.readInt(); // AttackCompose, AgilityCompose, LuckCompose, DefendCompose
    if (clientKind === "6600") { pkt.readInt(); pkt.readInt(); } // MagicAttack/MagicDefence (stub, não implementado)
    pkt.readInt(); // ValidDate
    pkt.readBoolean(); pkt.readBoolean(); // IsBinds, IsJudge
    const isUsed = pkt.readBoolean();
    if (isUsed) pkt.readString();
    for (let i = 0; i < 6; i++) pkt.readInt(); // Hole1-6
    pkt.readString(); pkt.readString(); // Hole, Pic
    pkt.readInt(); // RefineryLevel
    readDate(pkt);
    pkt.readByte(); pkt.readInt(); pkt.readByte(); pkt.readInt(); // Hole5Level, Hole5Exp, Hole6Level, Hole6Exp
    if (clientKind === "6600") {
      const isGold = pkt.readBoolean();
      if (isGold) { pkt.readInt(); readDate(pkt); }
      pkt.readInt(); // MagicLevel — o .cs 6600 nunca escreve isso (bug original); mandamos 0 pra não dar EOF.
    }
    // 4.1: nenhum campo depois de Hole6Exp (o C# original nunca escreveu isGold aqui — gap pré-existente,
    // não é regressão desta tarefa).
    expectFullyConsumed(pkt);
    c.close();
  });

  it("num===4 e num===5 (links zerados) são byte-idênticos nos dois clientKinds (5 e 8 ints)", async () => {
    const { c } = await loggedIn(server, { client: clientKind });
    c.out(119, (o) => {
      o.writeInt(4);
      if (clientKind === "6600") { o.writeUTF("k"); o.writeUTF(""); } else { o.writeUTF(""); o.writeInt(0); }
    });
    const r4 = await c.code(119);
    expect(r4.pkt.readInt()).toBe(4);
    r4.pkt.readString();
    for (let i = 0; i < 5; i++) expect(r4.pkt.readInt()).toBe(0);
    expectFullyConsumed(r4.pkt);

    const m = c.mark();
    c.out(119, (o) => {
      o.writeInt(5);
      if (clientKind === "6600") { o.writeUTF("k"); o.writeUTF(""); } else { o.writeUTF(""); o.writeInt(0); }
      o.writeUTF("extra"); // case 5 lê +1 string nos dois lados (packet.ReadString() extra no .cs)
    });
    const r5 = await c.code(119, undefined, m);
    expect(r5.pkt.readInt()).toBe(5);
    r5.pkt.readString();
    for (let i = 0; i < 8; i++) expect(r5.pkt.readInt()).toBe(0);
    expectFullyConsumed(r5.pkt);
    c.close();
  });
});

// --------------------------------------------------------------------------------------------- 63 ITEM_OPENUP
describe.each([["41"], ["6600"]] as const)("63 ITEM_OPENUP — client %s (abrir-caixa.ts)", (clientKind) => {
  it("box reward response: 6600 soma +2 ints (MagicAttack/MagicDefence) por item mesclado", async () => {
    const tplStore = server.ctx.templates;
    const boxId = clientKind === "6600" ? 920001 : 920002;
    const rewardId = clientKind === "6600" ? 921001 : 921002;
    tplStore.items.set(boxId, tpl({ TemplateID: boxId, CategoryID: 11, Property1: 6, MaxCount: 10, Name: "Caixa de teste" }));
    tplStore.items.set(rewardId, tpl({ TemplateID: rewardId, CategoryID: 7, MaxCount: 1, Name: "Premio de teste" }));
    const row: ItemBoxRow = {
      ID: boxId, TemplateId: rewardId, IsSelect: true, IsBind: false, ItemValid: 0, ItemCount: 1,
      StrengthenLevel: 0, AttackCompose: 0, DefendCompose: 0, AgilityCompose: 0, LuckCompose: 0, Random: 0, IsTips: 0, IsLogs: false,
    } as ItemBoxRow;
    tplStore.itemBoxes.set(boxId, [row]);

    const { c, player: p } = await loggedIn(server, { client: clientKind });
    const box = ItemInfo.createFromTemplate(tplStore.items.get(boxId)!, 1, 0, server.ctx.now());
    expect(p().propBag.addItem(box)).toBe(true);
    const place = box.Place;

    c.out(63, (o) => { o.writeByte(1); o.writeInt(place); o.writeInt(1); }); // PropBag=1
    const r = await c.code(63);
    const pkt = r.pkt;
    pkt.readString(); // nome da caixa
    const n = pkt.readByte();
    expect(n).toBe(1);
    for (let i = 0; i < n; i++) {
      expect(pkt.readInt()).toBe(rewardId); // TemplateID
      pkt.readInt(); pkt.readBoolean(); pkt.readInt(); // Count, IsBind, ValidDate
      pkt.readInt(); pkt.readInt(); pkt.readInt(); pkt.readInt(); // StrengthenLevel, AttackCompose, DefendCompose, AgilityCompose
      pkt.readInt(); // LuckCompose
      if (clientKind === "6600") { pkt.readInt(); pkt.readInt(); } // MagicAttack/MagicDefence stub
    }
    expectFullyConsumed(pkt);
    expect(p().getItemInventory(tplStore.items.get(rewardId)!)!.getItems().some((x) => x.TemplateID === rewardId)).toBe(true);
    c.close();
  });
});

// -------------------------------------------------------------------------------------------------------- 99 TEXP
describe("99 TEXP — treino-atributos.ts", () => {
  it("4.1: request de 3 campos (type, templateId, place), consome 1 por pacote", async () => {
    const tplStore = server.ctx.templates;
    const potionId = 930001;
    tplStore.items.set(potionId, tpl({ TemplateID: potionId, CategoryID: 20, Property2: 50, MaxCount: 10 }));
    const { c, player: p } = await loggedIn(server, { client: "41", grade: 20 });
    const potion = ItemInfo.createFromTemplate(tplStore.items.get(potionId)!, 5, 0, server.ctx.now());
    expect(p().storeBag.addItemTo(potion, 0)).toBe(true);
    const before = p().info.Texp.attTexpExp;
    const m = c.mark();
    c.out(99, (o) => { o.writeInt(1); o.writeInt(potionId); o.writeInt(0); }); // selectIndex=1(att), templateId, place
    await c.code(67, undefined, m); // updateProperties ecoa 67 — sinal de que o pacote foi processado
    expect(p().info.Texp.attTexpExp).toBe(before + 50);
    expect(p().info.Texp.texpCount).toBe(1);
    expect(p().storeBag.getItemAt(0)!.Count).toBe(4); // consumiu 1 só
    c.close();
  });

  it("6600: request de 4 campos (type, templateId, count, place), teto simples texpCount<=Grade, sem VIP", async () => {
    const tplStore = server.ctx.templates;
    const potionId = 930002;
    tplStore.items.set(potionId, tpl({ TemplateID: potionId, CategoryID: 20, Property2: 50, MaxCount: 10 }));
    const { c, player: p } = await loggedIn(server, { client: "6600", grade: 20 });
    const potion = ItemInfo.createFromTemplate(tplStore.items.get(potionId)!, 5, 0, server.ctx.now());
    expect(p().storeBag.addItemTo(potion, 0)).toBe(true);
    const before = p().info.Texp.attTexpExp;
    const m = c.mark();
    c.out(99, (o) => { o.writeInt(1); o.writeInt(potionId); o.writeInt(3); o.writeInt(0); }); // count=3, place=0
    await c.code(67, undefined, m);
    expect(p().info.Texp.attTexpExp).toBe(before + 50 * 3);
    expect(p().info.Texp.texpCount).toBe(3);
    expect(p().storeBag.getItemAt(0)!.Count).toBe(2); // consumiu 3 de uma vez
    c.close();
  });

  it("6600: count truncado pra não passar do teto (Grade)", async () => {
    const tplStore = server.ctx.templates;
    const potionId = 930003;
    tplStore.items.set(potionId, tpl({ TemplateID: potionId, CategoryID: 20, Property2: 10, MaxCount: 10 }));
    const { c, player: p } = await loggedIn(server, { client: "6600", grade: 5 });
    const potion = ItemInfo.createFromTemplate(tplStore.items.get(potionId)!, 10, 0, server.ctx.now());
    expect(p().storeBag.addItemTo(potion, 0)).toBe(true);
    const m = c.mark();
    c.out(99, (o) => { o.writeInt(0); o.writeInt(potionId); o.writeInt(10); o.writeInt(0); }); // pede 10, teto é Grade=5
    await c.code(67, undefined, m);
    expect(p().info.Texp.texpCount).toBe(5); // truncado em Grade-0
    expect(p().storeBag.getItemAt(0)!.Count).toBe(5); // só 5 consumidos
    c.close();
  });
});

// ------------------------------------------------------------------------------------- 237 colisão (PLAYER_DRESS)
describe("237 colisão — MARRYINFO_UPDATE (4.1 mural) vs PLAYER_DRESS (6600 figurino)", () => {
  it("4.1: 237 edita o mural normalmente", async () => {
    const db = (await sharedDb()).db;
    const { c, player: p } = await loggedIn(server, { client: "41", gold: 20000 });
    c.out(236); // MARRYINFO_ADD — publica o pedido (10000 ouro)
    await c.code(235);
    const infoId = p().info.MarryInfoID;
    expect(infoId).toBeGreaterThan(0);
    c.out(237, (o) => { o.writeBoolean(true); o.writeUTF("nova introducao"); });
    await c.code(235, undefined, c.mark());
    const [row] = await db.select().from(player.Marry_Info).where(eq(player.Marry_Info.ID, infoId));
    expect(row!.IsPublishEquip).toBe(true);
    expect(row!.Introduction).toBe("nova introducao");
    c.close();
  });

  it("6600: 237 (PLAYER_DRESS, sub-byte+int) NÃO corrompe o mural — cai no stub documentado", async () => {
    const db = (await sharedDb()).db;
    const { c, player: p } = await loggedIn(server, { client: "6600", gold: 20000 });
    c.out(236);
    await c.code(235);
    const infoId = p().info.MarryInfoID;
    expect(infoId).toBeGreaterThan(0);
    const [before] = await db.select().from(player.Marry_Info).where(eq(player.Marry_Info.ID, infoId));
    expect(before!.IsPublishEquip).toBe(false);
    expect(before!.Introduction).toBe("");

    // PLAYER_DRESS sub 2 CURRENT_MODEL: byte sub, int index — payload real do GameSocketOut.as 6600.
    c.out(237, (o) => { o.writeByte(2); o.writeInt(-1); });
    await new Promise((res) => setTimeout(res, 150)); // sem resposta esperada (stub é no-op)
    const [after] = await db.select().from(player.Marry_Info).where(eq(player.Marry_Info.ID, infoId));
    expect(after!.IsPublishEquip).toBe(false); // intacto — não foi lido como bool/string do mural
    expect(after!.Introduction).toBe("");
    c.close();
  });
});

// ------------------------------------------------------------------------ 67 UPDATE_PLAYER_INFO (sala mista)
describe("67 UPDATE_PLAYER_INFO — broadcast de sala mista (equip change via bolsa)", () => {
  it("cada espectador recebe o layout do PRÓPRIO clientKind quando outro jogador muda de equipamento", async () => {
    const tplStore = server.ctx.templates;
    const weaponId = 940001;
    tplStore.items.set(weaponId, tpl({ TemplateID: weaponId, CategoryID: 7, Attack: 10, MaxCount: 1 }));

    // sala mista: host 4.1 (sala Freedom, sem bot fallback) + convidado 6600.
    const host = await loggedIn(server, { client: "41", grade: 20 });
    host.c.out(16);
    await host.c.code(94, 9);
    host.c.out(94, (p) => { p.writeInt(0); p.writeByte(1); p.writeByte(2); p.writeUTF("sala-mista"); p.writeUTF(""); }); // GAME_ROOM_CREATE, roomType=1 (Freedom)
    await host.c.code(94, 0);

    // precisa de arma (hasMainWeapon) pra entrar na sala — mantém a arma default do slot 6 e equipa o item
    // de teste no slot 0 (chapéu), livre por padrão.
    const guest = await loggedIn(server, { client: "6600", grade: 20 });
    guest.c.out(16);
    await guest.c.code(94, 9);
    guest.c.out(94, (p) => { p.writeInt(1); p.writeBoolean(false); p.writeInt(1); p.writeInt(-1); p.writeInt(host.player().currentRoom!.RoomId); p.writeUTF(""); });
    await guest.c.code(94, 0);

    const markHost = host.c.mark();
    const markGuest = guest.c.mark();

    // equip change no CONVIDADO (6600) via bolsa: equipa um item novo no slot 0 (chapéu, livre por padrão —
    // gatilho real do hook onEquipChanged -> updatePlayerProperties -> updateProperties, o mesmo caminho
    // que mover.ts/49 usa).
    const g = guest.player();
    const hat = ItemInfo.createFromTemplate(tplStore.items.get(weaponId)!, 1, 0, server.ctx.now());
    g.equipBag.beginChanges();
    g.equipBag.addItemTo(hat, 0);
    g.equipBag.commitChanges();

    // HOST (4.1) recebe o broadcast — layout 4.1 (research/6600/packets-m1.md Detalhe C: sem MagicAttack/
    // MagicDefence, honorId em vez de nada extra, sem leagueMoney/PveEpicPermission).
    const atHost = await host.c.code(67, undefined, markHost);
    for (let i = 0; i < 11; i++) atHost.pkt.readInt(); // GP..Luck
    atHost.pkt.readInt(); atHost.pkt.readInt(); // hp, Hide
    atHost.pkt.readString(); atHost.pkt.readString(); atHost.pkt.readString(); atHost.pkt.readBoolean(); // Style, Colors, Skin, IsShowConsortia
    atHost.pkt.readInt(); atHost.pkt.readString(); atHost.pkt.readInt(); atHost.pkt.readInt(); atHost.pkt.readInt();
    atHost.pkt.readInt(); atHost.pkt.readString(); atHost.pkt.readString(); atHost.pkt.readInt();
    atHost.pkt.readInt(); atHost.pkt.readInt(); atHost.pkt.readString(); atHost.pkt.readInt();
    atHost.pkt.readString(); atHost.pkt.readInt(); atHost.pkt.readString();
    readDate(atHost.pkt);
    atHost.pkt.readInt(); atHost.pkt.readInt(); readDate(atHost.pkt); atHost.pkt.readInt();
    atHost.pkt.readInt(); atHost.pkt.readInt(); atHost.pkt.readInt(); atHost.pkt.readInt(); atHost.pkt.readInt();
    for (let i = 0; i < 5; i++) atHost.pkt.readInt();
    atHost.pkt.readInt(); atHost.pkt.readInt(); readDate(atHost.pkt);
    const lenH = atHost.pkt.readInt();
    for (let i = 0; i < lenH; i++) { atHost.pkt.readInt(); atHost.pkt.readByte(); }
    atHost.pkt.readInt(); atHost.pkt.readInt(); // evolutionGrade, evolutionExp
    expectFullyConsumed(atHost.pkt);

    // o próprio CONVIDADO (6600) recebe o self-send — layout 6600 (+MagicAttack/MagicDefence, honorId,
    // leagueMoney, PveEpicPermission — Detalhe C).
    const atGuest = await guest.c.code(67, undefined, markGuest);
    for (let i = 0; i < 11; i++) atGuest.pkt.readInt();
    atGuest.pkt.readInt(); atGuest.pkt.readInt(); // MagicAttack, MagicDefence
    atGuest.pkt.readInt(); atGuest.pkt.readInt(); // hp, Hide
    atGuest.pkt.readString(); atGuest.pkt.readString(); atGuest.pkt.readString(); atGuest.pkt.readBoolean();
    atGuest.pkt.readInt(); atGuest.pkt.readString(); atGuest.pkt.readInt(); atGuest.pkt.readInt(); atGuest.pkt.readInt();
    atGuest.pkt.readInt(); atGuest.pkt.readString(); atGuest.pkt.readString(); atGuest.pkt.readInt();
    atGuest.pkt.readInt(); atGuest.pkt.readInt(); atGuest.pkt.readString(); atGuest.pkt.readInt();
    atGuest.pkt.readString(); atGuest.pkt.readInt(); atGuest.pkt.readString();
    atGuest.pkt.readInt(); // honorId
    readDate(atGuest.pkt);
    atGuest.pkt.readInt(); atGuest.pkt.readInt(); readDate(atGuest.pkt); atGuest.pkt.readInt();
    atGuest.pkt.readInt(); atGuest.pkt.readInt(); atGuest.pkt.readInt(); atGuest.pkt.readInt(); atGuest.pkt.readInt();
    atGuest.pkt.readInt(); // leagueMoney
    for (let i = 0; i < 5; i++) atGuest.pkt.readInt();
    atGuest.pkt.readInt(); atGuest.pkt.readInt(); readDate(atGuest.pkt);
    const lenG = atGuest.pkt.readInt();
    for (let i = 0; i < lenG; i++) { atGuest.pkt.readInt(); atGuest.pkt.readByte(); }
    atGuest.pkt.readString(); // PveEpicPermission
    atGuest.pkt.readInt(); atGuest.pkt.readInt();
    expectFullyConsumed(atGuest.pkt);

    host.c.close();
    guest.c.close();
  }, 15000);
});
