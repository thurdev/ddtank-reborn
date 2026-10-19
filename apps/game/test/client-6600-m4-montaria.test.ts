/**
 * `m4-montaria` part 1 (`docs/plan/TASKS.md`): 260 HORSE (`HorsePackageType.cs`/`horse/HorseManager.as`),
 * 6600 only. Ownership/equip (sub 2/7), level-up/feed (sub 3), skill-up (sub 5), skill equip (sub 6) + the
 * stat bonus (`game/stats.ts computeStats`, mount level + "cherished" skins -> Magic/HP/Damage/Guard).
 * Ver `handlers/montaria/montaria.ts`, `game/montaria.ts`, `docs/features/montaria.md`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { ItemInfo, type ItemTemplate } from "../src/game/item.js";
import type { GamePlayer } from "../src/game/player.js";
import { loggedIn, startServer, type FakeClient } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

const tpl = (o: Partial<ItemTemplate>): ItemTemplate => ({
  TemplateID: 1, CategoryID: 10, Attack: 0, Defence: 0, Agility: 0, Luck: 0, Property1: 0, Property2: 0, Property3: 0, Property4: 0,
  Property5: 0, Property6: 0, Property7: 0, Property8: 0, Hole: "", MaxCount: 999, Level: 1, ReclaimType: 0, ReclaimValue: 0, ...o,
}) as ItemTemplate;

/** Puts `count` copies of a real (seeded) item template directly into PropBag slot `slot` — same shortcut
 *  `client-6600-m3-sell-goods.test.ts` uses, skips the login-time item-load round trip entirely. */
function giveItem(p: GamePlayer, templateId: number, count: number, slot: number): void {
  const t = server.ctx.templates.findItem(templateId)!;
  const it = ItemInfo.createFromTemplate(t, count, 0, server.ctx.now());
  p.propBag.beginChanges();
  p.propBag.addItemTo(it, slot);
  p.propBag.commitChanges();
}

const FEED = 11164; // "Star Upgrade Pill" — Property2 = 100 exp/item (real seed)
const SKILL_ITEM = 11165; // "Skill Upgrade Bead" — Property2 = 10 exp/item (real seed)

describe("260 HORSE — login burst (m4-montaria)", () => {
  it("6600: cria a linha Mount_Data na 1a vez e manda 260/1 GET_ALL_DATA + 260/8 HORSE_PICCHERISH_INFO (vazios)", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    const r1 = await c.code(260, 1);
    expect(r1.pkt.readByte()).toBe(1);
    expect(r1.pkt.readInt()).toBe(0); // curUseHorse
    expect(r1.pkt.readInt()).toBe(0); // curLevel
    expect(r1.pkt.readInt()).toBe(0); // curExp
    expect(r1.pkt.readInt()).toBe(0); // skills.length
    expect(r1.pkt.offset).toBe(r1.pkt.length);
    const r8 = await c.code(260, 8);
    expect(r8.pkt.readByte()).toBe(8);
    expect(r8.pkt.readInt()).toBe(0); // draws.length
    expect(r8.pkt.offset).toBe(r8.pkt.length);
    expect(p().mount).not.toBeNull();
    expect(p().mount!.UserID).toBe(p().id);
    c.close();
  });

  it("4.1 nunca manda 260 (feature nova do 6600)", async () => {
    const { c } = await loggedIn(server, { client: "41" });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.some((r) => r.code === 260)).toBe(false);
    c.close();
  });
});

describe("260/2 CHANGE_HORSE", () => {
  it("equipar (tag>0) aplica o bônus do Mount_Template do nível atual (grade 0) em magicAttack/magicDefence", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    await c.code(260, 1);
    const magicBefore = p().magicAttack;
    const m = c.mark();
    c.out(260, (o) => { o.writeByte(2); o.writeInt(5); });
    const r = await c.code(260, 2, m);
    expect(r.pkt.readByte()).toBe(2);
    expect(r.pkt.readInt()).toBe(5);
    expect(r.pkt.offset).toBe(r.pkt.length);
    expect(p().mount!.curUseHorse).toBe(5);
    expect(p().magicAttack).toBe(magicBefore + 30); // Mount_Template Grade=0 MagicAttack
    c.close();
  });

  it("desequipar (tag=0) remove o bônus de volta", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    await c.code(260, 1);
    const m = c.mark();
    c.out(260, (o) => { o.writeByte(2); o.writeInt(5); });
    await c.code(260, 2, m);
    const magicMounted = p().magicAttack;
    const m2 = c.mark();
    c.out(260, (o) => { o.writeByte(2); o.writeInt(0); });
    await c.code(260, 2, m2);
    expect(p().mount!.curUseHorse).toBe(0);
    expect(p().magicAttack).toBe(magicMounted - 30);
    c.close();
  });
});

describe("260/3 UP_HORSE — alimentar (feed) e subir de nível", () => {
  it("cobra ANTES de dar o exp (charge-before-grant); clampa pelo que o jogador tem; sobe de nível e concede a skill nova", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    await c.code(260, 1);
    giveItem(p(), FEED, 10, 0); // 10 * 100 = 1000 exp > Mount_Template Grade=1 Experience(338)
    const m = c.mark();
    c.out(260, (o) => { o.writeByte(3); o.writeInt(10); });
    const skillPush = c.code(260, 4, m);
    const r = await c.code(260, 3, m);
    expect(r.pkt.readByte()).toBe(3);
    expect(r.pkt.readBoolean()).toBe(true); // isHasLevelUp
    expect(r.pkt.readInt()).toBe(1); // novo Grade
    expect(r.pkt.readInt()).toBe(1000); // novo curExp
    expect(r.pkt.offset).toBe(r.pkt.length);
    expect(p().mount!.curLevel).toBe(1);
    expect(p().mount!.curExp).toBe(1000);
    expect(p().propBag.getItemAt(0)).toBeNull(); // as 10 pílulas foram todas consumidas
    const sp = await skillPush; // 260/4 GET_SKILL (Mount_Template Grade=1 SkillID=10801)
    expect(sp.pkt.readByte()).toBe(4);
    expect(sp.pkt.readInt()).toBe(10801);
    expect(sp.pkt.readInt()).toBe(0);
    c.close();
  });

  it("pede mais do que tem: clampa pela quantidade real (charge-before-grant, nunca sobra dívida)", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    await c.code(260, 1);
    giveItem(p(), FEED, 2, 0); // só 2 (200 exp, não sobe de nível ainda — Experience(1)=338)
    const m = c.mark();
    c.out(260, (o) => { o.writeByte(3); o.writeInt(99); }); // pede 99, só tem 2
    const r = await c.code(260, 3, m);
    expect(r.pkt.readByte()).toBe(3);
    expect(r.pkt.readBoolean()).toBe(false); // isHasLevelUp
    expect(r.pkt.readInt()).toBe(0); // Grade ainda 0
    expect(r.pkt.readInt()).toBe(200); // só os 2 reais * 100
    expect(p().propBag.getItemAt(0)).toBeNull(); // consumiu só os 2 que existiam
    c.close();
  });

  it("sem nenhuma pílula: não manda ack nenhum (igual ao original, num2 nunca passa de 0)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    await c.code(260, 1);
    const m = c.mark();
    c.out(260, (o) => { o.writeByte(3); o.writeInt(10); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 260 && r.sub === 3)).toBe(false);
    c.close();
  });
});

describe("260/5 UP_SKILL e 260/6 TAKE_UP_DOWN_SKILL", () => {
  async function levelUpToGrade1(p: () => GamePlayer, c: FakeClient) {
    giveItem(p(), FEED, 10, 0);
    const m = c.mark();
    c.out(260, (o) => { o.writeByte(3); o.writeInt(10); });
    await c.code(260, 3, m);
  }

  it("treina a skill 10801 (115+ itens cruza o 1º degrau, Exp=1150) e evolui pro id seguinte 10802", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    await c.code(260, 1);
    await levelUpToGrade1(p, c);
    giveItem(p(), SKILL_ITEM, 200, 1); // 200 * 10 = 2000 exp >= 1150 (Level2) e < 4250 (Level3)
    const m = c.mark();
    c.out(260, (o) => { o.writeByte(5); o.writeInt(10801); o.writeInt(200); });
    const r = await c.code(260, 5, m);
    expect(r.pkt.readByte()).toBe(5);
    expect(r.pkt.readInt()).toBe(10801); // oldSkillId (echo do pedido)
    expect(r.pkt.readInt()).toBe(10802); // newSkillId (evoluiu)
    expect(r.pkt.readInt()).toBe(2000); // newExp
    expect(r.pkt.offset).toBe(r.pkt.length);
    expect(p().mountSkills.has(10801)).toBe(false);
    expect(p().mountSkills.get(10802)).toEqual({ SKillID: 10802, Exp: 2000, IsUse: 0 });
    c.close();
  });

  it("skill não desbloqueada: recusa com mensagem, não cobra nenhum item", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    await c.code(260, 1);
    giveItem(p(), SKILL_ITEM, 50, 1);
    const m = c.mark();
    c.out(260, (o) => { o.writeByte(5); o.writeInt(99999); o.writeInt(10); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 260 && r.sub === 5)).toBe(false);
    expect(p().propBag.getItemByTemplateID(0, SKILL_ITEM)?.Count).toBe(50); // nada consumido
    c.close();
  });

  it("260/6 equipa/desequipa a skill num slot (0-3), sempre reconhece (ack) igual ao original", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    await c.code(260, 1);
    await levelUpToGrade1(p, c);
    const m = c.mark();
    c.out(260, (o) => { o.writeByte(6); o.writeInt(10801); o.writeInt(1); });
    const r = await c.code(260, 6, m);
    expect(r.pkt.readByte()).toBe(6);
    expect(r.pkt.readInt()).toBe(10801);
    expect(r.pkt.readInt()).toBe(1);
    expect(r.pkt.offset).toBe(r.pkt.length);
    expect(p().mountSkills.get(10801)?.IsUse).toBe(1);
    // desequipar
    const m2 = c.mark();
    c.out(260, (o) => { o.writeByte(6); o.writeInt(10801); o.writeInt(0); });
    await c.code(260, 6, m2);
    expect(p().mountSkills.get(10801)?.IsUse).toBe(0);
    c.close();
  });
});

describe("260/7 ACTIVE_HORSEPICCHERISH — consome o item e ativa a montaria \"especial\"", () => {
  it("consome 1 cópia do item (TemplateId do Mount_Draw_Template 101), ativa + manda 260/2 também, soma o bônus (inclusive quando já estava desmontado)", async () => {
    const drawTemplateId = 919711; // TemplateID só de teste (produção real é 11971, sem Shop_Goods p/ item de desenho)
    server.ctx.templates.items.set(drawTemplateId, tpl({ TemplateID: drawTemplateId, CategoryID: 11 }));
    // registra um Mount_Draw_Template de teste próprio (sem depender da seed real, que usa 11971)
    server.ctx.templates.mountDraws.set(9101, { ID: 9101, TemplateId: drawTemplateId, AddHurt: 1, AddGuard: 2, MagicAttack: 40, MagicDefence: 10, AddBlood: 150, Name: "Teste" });
    server.ctx.templates.mountDrawsByTemplate.set(drawTemplateId, server.ctx.templates.mountDraws.get(9101)!);
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    await c.code(260, 1);
    giveItem(p(), drawTemplateId, 1, 2);
    const magicBefore = p().magicAttack;
    const m = c.mark();
    c.out(260, (o) => { o.writeByte(7); o.writeInt(2); });
    const r7 = await c.code(260, 7, m);
    expect(r7.pkt.readByte()).toBe(7);
    expect(r7.pkt.readInt()).toBe(9101);
    expect(r7.pkt.readInt()).toBe(1);
    expect(r7.pkt.offset).toBe(r7.pkt.length);
    const r2 = await c.code(260, 2, m); // ActiveHorsePicCherish.cs também manda SendchangeHorse
    expect(r2.pkt.readByte()).toBe(2);
    expect(r2.pkt.readInt()).toBe(9101);
    expect(p().mount!.curUseHorse).toBe(9101);
    expect(p().mountPicCherish.get(9101)).toBe(1);
    expect(p().propBag.getItemAt(2)).toBeNull(); // item consumido
    // bônus: Mount_Template Grade=0 (curUseHorse>0 agora) + Mount_Draw_Template 9101, tudo somado
    expect(p().magicAttack).toBe(magicBefore + 30 /* mount level 0 */ + 40 /* draw */);
    c.close();
  });

  it("item no slot não é um desenho de montaria válido: recusa com mensagem, não consome nem ativa nada", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    await c.code(260, 1);
    const randomTplId = 919799;
    server.ctx.templates.items.set(randomTplId, tpl({ TemplateID: randomTplId, CategoryID: 10 }));
    giveItem(p(), randomTplId, 1, 3);
    const m = c.mark();
    c.out(260, (o) => { o.writeByte(7); o.writeInt(3); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 260)).toBe(false);
    expect(p().propBag.getItemAt(3)).not.toBeNull();
    c.close();
  });
});
