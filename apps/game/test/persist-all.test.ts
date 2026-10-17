/**
 * "Tudo que o jogador faz pra upar a conta tem que sobreviver a sair e voltar" (reclamação original do dono).
 * Este arquivo é só da Persistência (`db/**`, `game/player.ts`, `session/login.ts`) — não edita nenhum handler.
 * Padrão igual ao `forge-persist.test.ts`: age pelo pacote real (ou, quando a área ainda depende de tabela de
 * template não semeada no banco de teste, injeta o fixture mínimo direto no `Templates` já carregado / no banco),
 * `c.close()`, espera `quitPlayer -> saveIntoDatabase`, relê do banco com as funções de `db/*.ts` e confere.
 *
 * Como lê esse código (cada variável): `server` instância única do GameServer pra todo o arquivo; `dbItems`/
 * `dbCards`/`dbPets`/`dbProgress` releem o estado gravado (bypassando a memória do GamePlayer); `move`/`cardCmd`/
 * `petCmd` montam o corpo de pacotes já existentes (49 CHANGE_PLACE_GOODS, 216 CARDS_DATA, 68 PET).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { game, player as playerSchema } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import type { UserPetRow } from "../src/game/pets.js";
import type { UserCardRow } from "../src/game/cards.js";
import { loadUserItems } from "../src/db/items.js";
import { loadUserCardBag, loadUserPets } from "../src/db/pets-cards.js";
import { loadProgress } from "../src/db/social.js";
import { loadPlayerInfo } from "../src/db/characters.js";
import { loadAvatarCollection } from "../src/db/avatar-collection.js";
import { createCharacter, FakeClient, loggedIn, sharedDb, sleep, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server?.stop(); });

type W = { writeByte(n: number): void; writeInt(n: number): void; writeBoolean(b: boolean): void };
const move = (from: [number, number], to: [number, number], count: number) => (x: W) => {
  x.writeByte(from[0]); x.writeInt(from[1]); x.writeByte(to[0]); x.writeInt(to[1]); x.writeInt(count); x.writeBoolean(true);
};
const dbItems = async (userId: number) => {
  const m = await loadUserItems(server.ctx.db.db, userId, (id) => server.ctx.templates.findItem(id));
  return [...m.values()].flat();
};
const dbCards = (userId: number) => loadUserCardBag(server.ctx.db.db, userId);
const dbPets = (userId: number) => loadUserPets(server.ctx.db.db, userId);

/** Minimal UserPetRow (bypasses hatch/template requirements — the rename/equip ACTIONS themselves go through the
 * real 68 PET packet; only the pet's existence is seeded directly, same spirit as forge-persist.test.ts seeding
 * items directly before acting on them with the forge packets). */
function rawPet(templateId: number, place: number, userId: number): UserPetRow {
  // PetInventory.addPetTo (game/pets.ts) só seta Place/dirty — ao contrário do CardInventory.addCardTo, não seta
  // UserID; quem cria o pet de verdade (sub 2 AddPet, PetHandler case 2) passa o UserID pro createPet(). Sem isso
  // aqui, savePets grava a linha com UserID 0 e loadUserPets(db, ch.userId) nunca a acha.
  return {
    ID: 0, TemplateID: templateId, Name: "", UserID: userId, Attack: 1, Defence: 1, Luck: 1, Agility: 1, Blood: 1, Damage: 0, Guard: 0,
    AttackGrow: 0, DefenceGrow: 0, LuckGrow: 0, AgilityGrow: 0, BloodGrow: 0, DamageGrow: 0, GuardGrow: 0,
    Level: 1, GP: 0, MaxGP: 55, Hunger: 10, PetHappyStar: 2, MP: 0,
    IsEquip: false, Place: place, IsExit: true, Skill: "", SkillEquip: "0,0|-1,1|-1,2|-1,3|-1,4", currentStarExp: 0,
    breakGrade: 0, breakAttack: 0, breakDefence: 0, breakAgility: 0, breakLuck: 0, breakBlood: 0,
    eQPets: "[]", BaseProp: "", dirty: true,
  };
}
function rawCard(templateId: number, place: number, count: number): UserCardRow {
  return {
    CardID: 0, UserID: 0, TemplateID: templateId, Place: place, Count: count, Attack: 0, Defence: 0, Agility: 0, Luck: 0, Guard: 0, Damage: 0,
    AttackReset: 0, DefenceReset: 0, AgilityReset: 0, LuckReset: 0, Level: 0, CardGP: 0, isFirstGet: false, dirty: true,
  };
}

describe("Cartas (CARDS_DATA 216) — game/cards.ts + db/pets-cards.ts", () => {
  it("equipar (cmd 0) grava a cópia na Place 0 depois de sair e voltar", async () => {
    const { c, ch, player: p } = await loggedIn(server);
    const pl = p();
    const tplId = 900101 + Math.floor(Math.random() * 1000);
    pl.cardBag.addCardTo(rawCard(tplId, 10, 3), 10);
    c.out(216, (x) => { x.writeInt(0); x.writeInt(10); x.writeInt(0); }); // cmd 0: move/equip slot 10 -> place 0
    await sleep(150);
    c.close();
    await sleep(400);
    const rows = await dbCards(ch.userId);
    const equipped = rows.find((r) => r.TemplateID === tplId && r.Place === 0);
    expect(equipped).toBeDefined();
    expect(rows.find((r) => r.Place === 10)?.Count).toBe(3); // the bag copy stays, only a Count-0 clone is equipped
  });

  it("evoluir (cmd 3) grava Level/stats novos, mesmo precisando de CardUpdateCondition/Info", async () => {
    const tplId = 900201 + Math.floor(Math.random() * 1000);
    // CardUpdateCondition/CardUpdateInfo não entram no SEED_TABLES do helpers.ts (forge-only tables, mesma razão de
    // forge-persist.test.ts evitar caixas/fusão reais); injeta o fixture mínimo e recarrega o cache do Templates
    // (loadPetsCards), sem tocar em nenhum handler.
    await server.ctx.db.db.insert(game.CardUpdateCondition).values({ Level: 1, Exp: 1, MinExp: 5, MaxExp: 5, UpdateCardCount: 3, ResetCardCount: 0, ResetMoney: 0 }).onConflictDoNothing();
    await server.ctx.db.db.insert(game.CardUpdateInfo).values({ Id: tplId, Level: 1, Attack: 2, Defend: 1, Agility: 0, Lucky: 0, Guard: 0, Damage: 0 });
    await server.ctx.templates.loadPetsCards(server.ctx.db.db);
    const { c, ch, player: p } = await loggedIn(server);
    const pl = p();
    pl.cardBag.addCardTo(rawCard(tplId, 10, 5), 10);
    c.out(216, (x) => { x.writeInt(3); x.writeInt(10); }); // cmd 3: upgrade slot 10
    await sleep(150);
    c.close();
    await sleep(400);
    const row = (await dbCards(ch.userId)).find((r) => r.TemplateID === tplId);
    expect(row?.Level).toBe(1);
    expect(row?.Count).toBe(2); // 5 - UpdateCardCount(3)
    expect(row?.Attack).toBe(2);
  });
});

describe("Pets (PET 68) — game/pets.ts + db/pets-cards.ts", () => {
  it("renomear (sub 9) grava o novo nome", async () => {
    const { c, ch, player: p } = await loggedIn(server, { grade: 30, money: 1_000_000 });
    const pl = p();
    pl.petBag.addPetTo(rawPet(500101, 0, ch.userId), 0);
    c.out(68, (x) => { x.writeByte(9); x.writeInt(0); x.writeString("Totoro"); }); // sub 9 RenamePet: int place, str name
    await sleep(150);
    c.close();
    await sleep(400);
    const row = (await dbPets(ch.userId))[0];
    expect(row?.Name).toBe("Totoro");
  });

  it("equipar como pet de batalha (sub 17) grava IsEquip = true", async () => {
    const { c, ch, player: p } = await loggedIn(server, { grade: 30 });
    const pl = p();
    pl.petBag.addPetTo(rawPet(500102, 0, ch.userId), 0);
    c.out(68, (x) => { x.writeByte(17); x.writeInt(0); x.writeBoolean(true); }); // sub 17 FightPet: int place, bool equip
    await sleep(150);
    c.close();
    await sleep(400);
    const row = (await dbPets(ch.userId))[0];
    expect(row?.IsEquip).toBe(true);
  });
});

describe("Equipar item (CHANGE_PLACE_GOODS 49) — game/player.ts recalcStats", () => {
  it("mover da mochila pro slot de equipamento grava o item (bolsa/place) e Style/Colors do personagem", async () => {
    const tpl = server.ctx.templates;
    const anyItem = [...tpl.items.values()][0]!;
    const { c, ch, player: p } = await loggedIn(server);
    const pl = p();
    const it1 = ItemInfo.createFromTemplate(anyItem, 1, 101);
    pl.propBag.addItemTo(it1, 0);
    await pl.saveIntoDatabase(server.ctx.db.db); // item já existe no banco (ItemID > 0), como no jogo real
    c.out(49, move([1, 0], [0, 1], 1)); // PropBag[0] -> EquipBag[1]
    await sleep(150);
    c.close();
    await sleep(400);
    const rows = await dbItems(ch.userId);
    const moved = rows.find((r) => r.TemplateID === anyItem.TemplateID);
    expect(moved?.Place).toBe(1);
    expect(moved?.BagType).toBe(0);
    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    expect(info?.Style ?? "").toContain(`${anyItem.TemplateID}|`);
  });
});

describe("Treino de atributos (TEXP 99) — db/characters.ts Sys_Users_Texp", () => {
  it("consome a poção e grava o exp de Texp (tabela separada, upsert em savePlayerInfo)", async () => {
    const tpl = server.ctx.templates;
    const potion = [...tpl.items.values()].find((t) => t.CategoryID === 20 && t.Property2 > 0);
    expect(potion).toBeDefined();
    const { c, ch, player: p } = await loggedIn(server);
    const pl = p();
    const it1 = ItemInfo.createFromTemplate(potion!, 1, 101);
    pl.storeBag.addItemTo(it1, 0);
    c.out(99, (x) => { x.writeInt(1); x.writeInt(potion!.TemplateID); x.writeInt(0); }); // selectIndex 1 = attTexpExp
    await sleep(150);
    c.close();
    await sleep(400);
    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    expect(info?.Texp.attTexpExp).toBe(potion!.Property2);
  });
});

describe("Usar item (CARD_USE 183) — game/player.ts addGP + db/social.ts saveBuffs", () => {
  it("pílula de GP: consome o item e soma GP (persistido em Sys_Users_Detail.GP)", async () => {
    const tpl = server.ctx.templates;
    const pill = [...tpl.items.values()].find((t) => t.Property1 === 21 && t.Property2 > 0 && t.CanDelete);
    expect(pill).toBeDefined();
    const { c, ch, player: p } = await loggedIn(server);
    const pl = p();
    const before = pl.info.GP;
    const it1 = ItemInfo.createFromTemplate(pill!, 1, 101);
    pl.propBag.addItemTo(it1, 0);
    c.out(183, (x) => { x.writeInt(1); x.writeInt(0); x.writeInt(0); x.writeInt(0); x.writeBoolean(false); }); // bagType 1 (PropBag), place 0, n=0
    await sleep(150);
    c.close();
    await sleep(400);
    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    expect(info?.GP).toBe(before + pill!.Property2);
  });

  it("carta de buff: grava o User_Buff (SAVED se p.buffs.length, saveIntoDatabase)", async () => {
    const tpl = server.ctx.templates;
    const buff = [...tpl.items.values()].find((t) => t.Property1 > 0 && t.Property1 !== 21 && t.Property1 !== 23 && t.CanDelete);
    expect(buff).toBeDefined();
    const { c, ch, player: p } = await loggedIn(server);
    const pl = p();
    const it1 = ItemInfo.createFromTemplate(buff!, 1, 101);
    pl.propBag.addItemTo(it1, 0);
    c.out(183, (x) => { x.writeInt(1); x.writeInt(0); x.writeInt(0); x.writeInt(0); x.writeBoolean(false); });
    await sleep(150);
    c.close();
    await sleep(400);
    const progress = await loadProgress(server.ctx.db.db, ch.userId);
    expect(progress.buffs.find((b) => b.Type === buff!.Property1)).toBeDefined();
  });
});

describe("Correio (GET_MAIL_ATTACHMENT 113) — handlers/correio/ saveItem imediato", () => {
  it("resgatar o anexo move o item pra mochila do jogador e persiste", async () => {
    const tpl = server.ctx.templates;
    const anyItem = [...tpl.items.values()][0]!;
    const { c, ch } = await loggedIn(server);
    const [goods] = await server.ctx.db.db.insert(playerSchema.Sys_Users_Goods).values({ UserID: 0, TemplateID: anyItem.TemplateID, Count: 1, BagType: -1, Place: -1 }).returning({ ItemID: playerSchema.Sys_Users_Goods.ItemID });
    const [mail] = await server.ctx.db.db.insert(playerSchema.User_Messages).values({ ReceiverID: ch.userId, SenderID: 0, Sender: "Correio", Title: "Presente", Annex1: String(goods!.ItemID), IsExist: true }).returning({ ID: playerSchema.User_Messages.ID });
    c.out(113, (x) => { x.writeInt(mail!.ID); x.writeByte(1); }); // which=1 (Annex1)
    await sleep(150);
    c.close();
    await sleep(400);
    const rows = await dbItems(ch.userId);
    expect(rows.find((r) => r.TemplateID === anyItem.TemplateID && r.ItemID === goods!.ItemID)).toBeDefined();
  });
});

describe("Moedas (GamePlayer.add*/remove*) — game/player.ts + db/characters.ts savePlayerInfo", () => {
  it("gold, money, giftToken e medalha (item 11408) sobrevivem a sair e voltar", async () => {
    const tpl = server.ctx.templates;
    const { c, ch, player: p } = await loggedIn(server, { gold: 1000, money: 1000 });
    const pl = p();
    pl.addGold(500);
    pl.addMoney(300);
    pl.addGiftToken(70);
    pl.addMedal(2, (id) => tpl.findItem(id));
    c.close();
    await sleep(400);
    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    expect(info?.Gold).toBe(1500);
    expect(info?.Money).toBe(1300);
    expect(info?.GiftToken).toBe(70);
    const rows = await dbItems(ch.userId);
    expect(rows.filter((r) => r.TemplateID === 11408).reduce((a, r) => a + r.Count, 0)).toBe(2);
  });
});

describe("session/login.ts — recarrega achievements/buffs/quests/extra gravados fora do saveIntoDatabase", () => {
  it("login carrega AchievementData, User_Buff e QuestData inseridos direto no banco", async () => {
    const db = await sharedDb();
    const ch = await createCharacter(db); // personagem ainda offline: nada em memória, só o que for inserido aqui
    const achId = 70001 + Math.floor(Math.random() * 1000);
    await db.db.insert(playerSchema.AchievementData).values({ UserID: ch.userId, AchievementID: achId, IsComplete: true, CompletedDate: new Date() });
    await db.db.insert(playerSchema.User_Buff).values({ UserID: ch.userId, Type: 999, Value: 1, BeginDate: new Date(), ValidDate: 999999, TemplateID: 0, ValidCount: 0, Data: null, IsExist: true });
    const anyQuest = [...server.ctx.templates.quests.keys()][0];
    if (anyQuest !== undefined) await db.db.insert(playerSchema.QuestData).values({ UserID: ch.userId, QuestID: anyQuest, IsComplete: false, IsExist: true }).onConflictDoNothing();
    const fc = FakeClient.memory(server);
    fc.login(ch.user, ch.pass);
    await fc.code(95);
    const pl = server.ctx.world.get(ch.userId)!;
    expect(pl.achievements.some((a) => a.AchievementID === achId)).toBe(true);
    expect(pl.buffs.some((b) => b.Type === 999)).toBe(true);
    if (anyQuest !== undefined) expect(pl.quests.some((q) => q.QuestID === anyQuest)).toBe(true);
    fc.close();
    await sleep(200);
  });
});

/** Pacotes de progressão usam seus caches de templates e o formato real do cliente (sem falhas esperadas). */
describe("Progressão gravada pelo protocolo", () => {
  it("136 TOTEM sobe totemId e persiste custos em myHonor/Money", async () => {
    await server.ctx.db.db.insert(game.Totem_Info).values({ ID: 10001, AddAttack: 1, ConsumeExp: 100, ConsumeHonor: 10 })
      .onConflictDoUpdate({ target: game.Totem_Info.ID, set: { AddAttack: 1, ConsumeExp: 100, ConsumeHonor: 10 } });
    await server.ctx.templates.loadProgression(server.ctx.db.db);
    const { c, ch, player: p } = await loggedIn(server, { grade: 25, money: 100_000 });
    const pl = p();
    pl.info.myHonor = 100;
    c.out(136);
    await sleep(150);
    c.close();
    await sleep(400);
    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    expect(info?.totemId).toBe(10001);
    expect(info?.myHonor).toBe(90);
    expect(info?.Money).toBe(99_900);
  });

  it("96 HONOR_UP_COUNT tipo 2 compra honra com Money e persiste MaxBuyHonor/myHonor/Money", async () => {
    await server.ctx.db.db.insert(game.Totem_Honor_Template).values({ ID: 1, Type: 1, NeedMoney: 50, AddHonor: 5 })
      .onConflictDoUpdate({ target: game.Totem_Honor_Template.ID, set: { Type: 1, NeedMoney: 50, AddHonor: 5 } });
    await server.ctx.templates.loadProgression(server.ctx.db.db);
    const { c, ch, player: p } = await loggedIn(server, { money: 1_000 });
    p().info.myHonor = 0; // MaxBuyHonor começa em 0 no personagem novo -> id buscado = 0+1 = 1 (a linha de cima)
    c.out(96, (x) => { x.writeByte(2); x.writeBoolean(false); });
    await sleep(150);
    c.close();
    await sleep(400);
    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    expect(info?.MaxBuyHonor).toBe(1);
    expect(info?.myHonor).toBe(5);
    expect(info?.Money).toBe(950);
  });

  it("402/3 AVATAR_COLLECTION ACTIVE desconta Gold e persiste o conjunto em Sys_Users_AvatarCollection", async () => {
    const setId = 970042;
    const itemId = 11160; // mesmo item-estoque que o teste de NECKLACE_STRENGTH usa (já semeado via Shop_Goods)
    await server.ctx.db.db.insert(game.ClothGroupTemplateInfo).values([
      { ID: setId, TemplateID: itemId, Sex: 1, Description: 0, Cost: 300 },
      { ID: setId, TemplateID: itemId + 1, Sex: 1, Description: 0, Cost: 300 }, // 2a peça do conjunto: só pra total=2 -> half=1
    ]);
    await server.ctx.db.db.insert(game.ClothPropertyTemplateInfo)
      .values({ ID: setId, Sex: 1, Name: "Teste", Attack: 0, Defend: 0, Agility: 0, Luck: 0, Blood: 0, Damage: 0, Guard: 0, Cost: 0 });
    await server.ctx.templates.loadProgression(server.ctx.db.db);
    const { c, ch, player: p } = await loggedIn(server, { gold: 10_000 });
    const pl = p();
    pl.equipBag.addItemTo(ItemInfo.createFromTemplate(server.ctx.templates.findItem(itemId)!, 1, 101), 20);
    const goldBefore = pl.info.Gold;
    c.out(402, (x) => { x.writeByte(3); x.writeInt(setId); x.writeInt(itemId); x.writeInt(1); });
    await sleep(150);
    c.close();
    await sleep(400);
    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    expect(info?.Gold).toBe(goldBefore - 300);
    const rows = await loadAvatarCollection(server.ctx.db.db, ch.userId);
    const row = rows.find((r) => r.AvatarID === setId);
    expect(row?.IsActive).toBe(true); // 1 de 2 peças = half -> ativa na hora (UserAvatarCollectionInfo.ActiveAvatar)
    expect(row?.items).toEqual([{ TemplateID: itemId, Sex: 1 }]);
    // Bônus de Damage/Guard (getAvatarCollectionBonus, game/stats.ts): half-collected (1 de 2) soma uma vez o
    // ClothPropertyTemplateInfo.Damage/Guard do conjunto em baseAttack/baseDefence (GamePlayer.GetBaseAttack/
    // GetBaseDefence, GamePlayer.cs:2538-2556/2626-2644). Property Damage/Guard não foram setados (0) acima —
    // isso só confere que o bônus continua aplicado depois de sair e voltar a logar (reload do avatarCollect).
    const c2 = FakeClient.memory(server);
    c2.login(ch.user, ch.pass);
    await c2.code(95);
    const p2 = server.ctx.world.get(ch.userId)!;
    expect(p2.avatarCollect.find((a) => a.AvatarID === setId)?.items).toEqual([{ TemplateID: itemId, Sex: 1 }]);
    c2.close();
  });

  // Bloco F (handlers/basico/opcoes.ts): 64 OPTION_UPDATE agora porta OptionHandler.cs (DDT-6600 reference; o handler
  // file não existe em vendor/DDTank41, só o campo OptionOnOff e o enum, mas o comportamento é o mesmo nos dois).
  it("64 OPTION_UPDATE grava OptionOnOff", async () => {
    const { c, ch } = await loggedIn(server);
    c.out(64, (x) => x.writeInt(42));
    await sleep(150);
    c.close();
    await sleep(400);
    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    expect(info?.OptionOnOff).toBe(42);
  });

  // NecklaceStrengthHandler.cs:16-18 / GameSocketOut.as: byte type, int stonePlace, int count.
  it("95 NECKLACE_STRENGTH consome a pedra e persiste necklaceExp", async () => {
    const { c, ch, player: p } = await loggedIn(server, { gold: 1_000_000 });
    const stone = ItemInfo.createFromTemplate(server.ctx.templates.findItem(11160)!, 2, 101);
    p().propBag.addItemTo(stone, 0);
    server.ctx.templates.strengthenExp.set(0, { ID: 990001, Level: 0, Exp: 0, NecklaceStrengthExp: 0, NecklaceStrengthPlus: 0 });
    server.ctx.templates.strengthenExp.set(12, { ID: 990002, Level: 12, Exp: 0, NecklaceStrengthExp: stone.template.Property2 * 10, NecklaceStrengthPlus: 12 });
    const before = p().info.necklaceExp;
    c.out(95, (x) => { x.writeByte(2); x.writeInt(0); x.writeInt(1); });
    await sleep(150);
    c.close();
    await sleep(400);
    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    expect(info?.necklaceExp).toBe(before + stone.template.Property2);
    expect((await dbItems(ch.userId)).find((row) => row.TemplateID === 11160)?.Count).toBe(1);
  });
});
