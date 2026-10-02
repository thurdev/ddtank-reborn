import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import {
  DEFAULT_DUTIES, Right, bankCapacity, buffTypeForGroup, canBuyGuildShop, checkCreate, checkRemoveMember, defaultByteCount, donationRiches, dutyMove, fightRewards, gradeChange,
  hasRight, kickBudget, missionRiches, skillCost, smithBonusLevel, upgrade, upgradeMsg, upgradeNoticeKey, userRemarkAllowed, type LevelRow,
} from "../src/game/consortia.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";

// player."Consortia_Level" as shipped (Project_Player34)
const LEVELS: LevelRow[] = [
  [1, 100, 0, 500, 1000, 5000, 10000], [2, 105, 630, 2500, 5000, 50000, 30000], [3, 110, 1500, 8500, 17000, 150000, 70000],
  [4, 115, 6300, 18500, 37000, 250000, 150000], [5, 120, 18600, 32500, 65000, 700000, 200000], [6, 125, 50400, 50500, 101000, 0, 400000],
].map(([Level, Count, Riches, StoreRiches, SmithRiches, ShopRiches, BufferRiches]) => ({ Level: Level!, Count: Count!, Riches: Riches!, Reward: 0, NeedGold: 100000, StoreRiches: StoreRiches!, SmithRiches: SmithRiches!, ShopRiches: ShopRiches!, BufferRiches: BufferRiches!, KickMax: 20 }));
const LV = new Map(LEVELS.map((l) => [l.Level, l]));
const g = (o: Partial<{ Level: number; Riches: number; StoreLevel: number; ShopLevel: number; SmithLevel: number; SkillLevel: number }>) => ({ Level: 1, Riches: 0, StoreLevel: 0, ShopLevel: 0, SmithLevel: 0, SkillLevel: 0, ...o });

describe("consortia rules (procedures re-implemented)", () => {
  it("default duties and rights match SP_Consortia_Add", () => {
    expect(DEFAULT_DUTIES.map((d) => d.right)).toEqual([4095, 6191, 4103, 4096, 4096]);
    const [chair, vice, officer, elite] = DEFAULT_DUTIES.map((d) => d.right);
    expect(hasRight(chair, Right.Expel) && hasRight(chair, Right.UpGrade) && hasRight(chair, Right.Ratify)).toBe(true);
    expect(hasRight(vice, Right.Ratify) && hasRight(vice, Right.Expel) && hasRight(vice, Right.UpGrade)).toBe(true);
    expect(hasRight(vice, Right.Diplomatism)).toBe(false);
    expect(hasRight(officer, Right.Ratify) && hasRight(officer, Right.BanChat) && !hasRight(officer, Right.Expel)).toBe(true);
    expect(hasRight(elite, Right.Invite)).toBe(false);
    expect(hasRight(null, Right.Ratify)).toBe(false);
  });

  it("create: grade 5, 500 money (+locked), level-1 NeedGold, name <= 12 bytes", () => {
    const p = { ConsortiaID: 0, Gold: 100000, Grade: 5, Money: 400, MoneyLock: 100 };
    expect(checkCreate(p, "Guild", 100000)).toBe("ok");
    expect(checkCreate({ ...p, Gold: 99999 }, "Guild", 100000)).toBe("cost");
    expect(checkCreate({ ...p, Grade: 4 }, "Guild", 100000)).toBe("cost");
    expect(checkCreate({ ...p, MoneyLock: 99 }, "Guild", 100000)).toBe("cost");
    expect(checkCreate({ ...p, ConsortiaID: 3 }, "Guild", 100000)).toBe("inGuild");
    expect(checkCreate(p, "abcdefghijklm", 100000)).toBe("name");
    expect(checkCreate(p, "", 100000)).toBe("name");
    expect(defaultByteCount("Sóc")).toBe(4);
  });

  it("donation: riches = money / 2, money 1 gives nothing", () => {
    expect(donationRiches(1001, 5000)).toEqual({ ok: true, riches: 500 });
    expect(donationRiches(1, 5000).err).toBe("RichIsNotFound");
    expect(donationRiches(6000, 5000).err).toBe("NoMoney");
    expect(donationRiches(0, 5000).err).toBe("NoMoney");
  });

  it("guild level up costs riches of the next level and raises MaxCount", () => {
    expect(upgrade(1, g({ Level: 1, Riches: 629 }), LV).code).toBe(4);
    expect(upgrade(1, g({ Level: 1, Riches: 700 }), LV)).toMatchObject({ code: 0, cost: 630, newLevel: 2, set: { Level: 2, MaxCount: 105, Riches: 70 } });
    expect(upgrade(1, g({ Level: 6, Riches: 1e9 }), LV).code).toBe(3); // no level 7 row here
  });

  it("buildings are capped by the guild level (shop by Level / 2) and cost the next building level", () => {
    expect(upgrade(2, g({ Level: 1, StoreLevel: 1, Riches: 1e6 }), LV).code).toBe(3);
    expect(upgrade(2, g({ Level: 2, StoreLevel: 1, Riches: 2499 }), LV)).toMatchObject({ code: 5, cost: 2500 });
    expect(upgrade(2, g({ Level: 2, StoreLevel: 1, Riches: 2500 }), LV)).toMatchObject({ code: 0, newLevel: 2, set: { StoreLevel: 2, Riches: 0 } });
    expect(upgrade(3, g({ Level: 3, ShopLevel: 1, Riches: 1e6 }), LV).code).toBe(3); // 3/2 = 1
    expect(upgrade(3, g({ Level: 4, ShopLevel: 1, Riches: 50000 }), LV)).toMatchObject({ code: 0, cost: 50000 });
    expect(upgrade(4, g({ Level: 3, SmithLevel: 0, Riches: 1000 }), LV)).toMatchObject({ code: 0, cost: 1000 });
    expect(upgrade(5, g({ Level: 3, SkillLevel: 2, Riches: 69999 }), LV).code).toBe(5);
    // fixed message mapping: 5 = riches, 3/4 = cannot upgrade
    expect(upgradeMsg(2, 5)).toBe("ConsortiaBussiness.UpGradeStoreConsortia.Msg4");
    expect(upgradeMsg(2, 3)).toBe("ConsortiaBussiness.UpGradeStoreConsortia.Msg3");
    expect(upgradeMsg(1, 4)).toBe("ConsortiaBussiness.UpGradeConsortia.Msg4");
    expect(upgradeNoticeKey(5, 3)).toBe("ConsortiaBufferUpGradeHandler.Notice");
    expect(upgradeNoticeKey(1, 4)).toBeNull();
  });

  it("leave / kick permissions and the daily kick budget", () => {
    expect(checkRemoveMember({ level: 5, right: 4096 }, true, false)).toBe(0); // member leaves
    expect(checkRemoveMember({ level: 1, right: 4095 }, true, true)).toBe(3); // chairman cannot leave
    expect(checkRemoveMember({ level: 3, right: 4103 }, false, false)).toBe(2); // officer has no Expel
    expect(checkRemoveMember({ level: 2, right: 6191 }, false, true)).toBe(4); // nobody kicks the chairman
    expect(checkRemoveMember(null, true, false)).toBe(2);
    const today = new Date("2026-10-02T10:00:00Z");
    expect(kickBudget(new Date("2026-10-01T00:00:00Z"), 0, 20, today)).toMatchObject({ ok: true, count: 19 });
    expect(kickBudget(new Date("2026-10-02T00:00:00Z"), 1, 20, today)).toMatchObject({ ok: true, count: 0 });
    expect(kickBudget(new Date("2026-10-02T00:00:00Z"), 0, 20, today).ok).toBe(false);
  });

  it("promote / demote one step (UpGrade right; vice is the top promotion)", () => {
    expect(gradeChange(4103, 5, 5, true).code).toBe(2);
    expect(gradeChange(6191, 5, 5, true)).toEqual({ code: 0, level: 4 });
    expect(gradeChange(4095, 2, 5, true).code).toBe(4);
    expect(gradeChange(4095, 1, 5, false).code).toBe(3);
    expect(gradeChange(4095, 5, 5, false).code).toBe(5);
    expect(gradeChange(4095, 3, 5, false)).toEqual({ code: 0, level: 4 });
    expect(dutyMove(3, 2, 5)).toBe(3);
    expect(dutyMove(3, 4, 5)).toBe(0);
    expect(dutyMove(4, 4, 5)).toBe(4);
    expect(dutyMove(4, 2, 5)).toBe(0);
    expect(userRemarkAllowed(4095)).toBe(true); // the proc's "Right & 0" made it always fail
    expect(userRemarkAllowed(4096)).toBe(false);
  });

  it("guild shop, smith and bank gates", () => {
    expect(canBuyGuildShop(11, 7, 1, 100, undefined)).toBe(true); // default threshold 100
    expect(canBuyGuildShop(11, 7, 1, 99, undefined)).toBe(false);
    expect(canBuyGuildShop(12, 7, 1, 1e6, undefined)).toBe(false); // shop level 1 < tier 2
    expect(canBuyGuildShop(13, 7, 3, 500, 600)).toBe(false);
    expect(canBuyGuildShop(11, 0, 5, 1e6, undefined)).toBe(false);
    expect(smithBonusLevel(true, true, 3, 100, undefined)).toEqual({ level: 3, denied: false });
    expect(smithBonusLevel(true, true, 3, 50, undefined).denied).toBe(true);
    expect(smithBonusLevel(false, true, 3, 0, undefined)).toEqual({ level: 0, denied: false });
    expect(bankCapacity(3)).toBe(30);
    expect(missionRiches("3000|3000|5000", 3)).toBe(5000);
    expect(missionRiches("3000", 4)).toBe(0);
  });

  it("guild war rewards (SP_Consortia_Fight once, offer per side)", () => {
    const base = { roomType: 0, offerRate: 1, richesRate: 1, winLevel: 3, loseLevel: 3 };
    expect(fightRewards({ ...base, gameType: 1, playerCount: 4, totalHurt: 5000 })).toEqual({ riches: 4, winOffer: 12, loseOfferAdd: 1, loseOfferRemove: 10 });
    expect(fightRewards({ ...base, gameType: 1, playerCount: 4, totalHurt: 0, winLevel: 2 })!.riches).toBe(1); // level < 3 -> min 1
    expect(fightRewards({ ...base, gameType: 0, playerCount: 2, totalHurt: 9999 })).toEqual({ riches: 1, winOffer: 3, loseOfferAdd: 0, loseOfferRemove: 3 });
    expect(fightRewards({ ...base, roomType: 1, gameType: 1, playerCount: 2, totalHurt: 0 })).toBeNull();
  });

  it("guild skill costs: type-1 buffs need the guild riches (fixed free-buff bug)", () => {
    const buff = { type: 1, level: 1, riches: 1000, metal: 30 };
    expect(skillCost(buff, 1, 1, { Level: 1, Riches: 500 }, { riches: 5000, medals: 0 })).toEqual({ ok: false, msg: "Consortia.Msg6" });
    expect(skillCost(buff, 2, 1, { Level: 1, Riches: 5000 }, { riches: 5000, medals: 0 })).toEqual({ ok: true, source: "guild", amount: 2000, minutes: 2880 });
    expect(skillCost({ ...buff, type: 2 }, 1, 1, { Level: 1, Riches: 0 }, { riches: 1000, medals: 0 })).toMatchObject({ ok: true, source: "player" });
    expect(skillCost({ ...buff, level: 3 }, 1, 2, { Level: 2, Riches: 0 }, { riches: 0, medals: 100 })).toEqual({ ok: false, msg: "Consortia.Msg5" });
    expect(skillCost(buff, 1, 2, { Level: 2, Riches: 0 }, { riches: 0, medals: 30 })).toMatchObject({ ok: true, source: "medal", amount: 30 });
    expect(buffTypeForGroup(1)).toEqual({ type: 101, guildWide: false });
    expect(buffTypeForGroup(2)).toEqual({ type: 102, guildWide: true });
    expect(buffTypeForGroup(8)).toBeNull();
  });
});

describe("129 CONSORTIA_CMD (end to end)", () => {
  let server: GameServer;
  beforeAll(async () => {
    const db = (await sharedDb()).db;
    const n = await db.select().from(player.Consortia_Level);
    if (!n.length) await db.insert(player.Consortia_Level).values(LEVELS.map((l) => ({ ...l, Deduct: 0, NeedItem: 0, BossCount: 0 })));
    server = await startServer();
  });
  afterAll(async () => {
    await server.stop();
  });

  it("create, apply, accept, promote, donate, kick", async () => {
    const db = (await sharedDb()).db;
    const a = await loggedIn(server, { gold: 150000, money: 2000 });
    const b = await loggedIn(server, { gold: 0, money: 3000 });
    const name = `G${Date.now() % 1e6}`;

    a.c.out(129, (o) => { o.writeInt(1); o.writeUTF(name); });
    const cr = await a.c.code(129, 1);
    cr.pkt.readByte();
    expect(cr.pkt.readString()).toBe(name);
    expect(cr.pkt.readBoolean()).toBe(true);
    const cid = cr.pkt.readInt();
    expect(cid).toBeGreaterThan(0);
    expect(a.player().info.Gold).toBe(50000);
    expect(a.player().info.Money).toBe(1500);
    expect(a.player().info.DutyLevel).toBe(1);

    // a guildless player cannot kick / an apply to a full or missing guild fails
    b.c.out(129, (o) => { o.writeInt(0); o.writeInt(999999); });
    const bad = await b.c.code(129, 0);
    bad.pkt.readByte(); bad.pkt.readInt();
    expect(bad.pkt.readBoolean()).toBe(false);

    let m0 = b.c.mark();
    b.c.out(129, (o) => { o.writeInt(0); o.writeInt(cid); });
    const ap = await b.c.code(129, 0, m0);
    ap.pkt.readByte(); ap.pkt.readInt();
    expect(ap.pkt.readBoolean()).toBe(true);
    const [apply] = await db.select().from(player.Consortia_Apply_Users).where(eq(player.Consortia_Apply_Users.UserID, b.ch.userId));

    let mark = b.c.mark();
    a.c.out(129, (o) => { o.writeInt(4); o.writeInt(apply!.ID); });
    const pass = await a.c.code(129, 4);
    pass.pkt.readByte(); pass.pkt.readInt();
    expect(pass.pkt.readBoolean()).toBe(true);
    await b.c.code(128, 1, mark); // HandleConsortiaUserPass -> the new member
    expect(b.player().info.ConsortiaID).toBe(cid);
    expect(b.player().info.DutyLevel).toBe(5);

    // member (level 5) has no Expel right
    b.c.out(129, (o) => { o.writeInt(3); o.writeInt(a.ch.userId); });
    const nokick = await b.c.code(129, 3);
    nokick.pkt.readByte(); nokick.pkt.readInt();
    expect(nokick.pkt.readBoolean()).toBe(false);

    a.c.out(129, (o) => { o.writeInt(18); o.writeInt(b.ch.userId); o.writeBoolean(true); });
    const up = await a.c.code(129, 18);
    up.pkt.readByte(); up.pkt.readInt(); up.pkt.readBoolean();
    expect(up.pkt.readBoolean()).toBe(true);
    expect(b.player().info.DutyLevel).toBe(4);

    b.c.out(129, (o) => { o.writeInt(6); o.writeInt(2001); });
    const don = await b.c.code(129, 6);
    don.pkt.readByte(); don.pkt.readInt();
    expect(don.pkt.readBoolean()).toBe(true);
    expect(b.player().info.Money).toBe(999);
    expect(b.player().info.RichesOffer).toBe(1000);
    const [c1] = await db.select().from(player.Consortia).where(eq(player.Consortia.ConsortiaID, cid));
    expect(c1!.Riches).toBe(1000);

    // chairman cannot leave; kicking b works and clears his guild fields
    a.c.out(129, (o) => { o.writeInt(3); o.writeInt(a.ch.userId); });
    const leave = await a.c.code(129, 3);
    leave.pkt.readByte(); leave.pkt.readInt();
    expect(leave.pkt.readBoolean()).toBe(false);
    mark = b.c.mark();
    m0 = a.c.mark();
    a.c.out(129, (o) => { o.writeInt(3); o.writeInt(b.ch.userId); });
    const kick = await a.c.code(129, 3, m0);
    kick.pkt.readByte(); kick.pkt.readInt();
    expect(kick.pkt.readBoolean()).toBe(true);
    await b.c.code(128, 3, mark);
    expect(b.player().info.ConsortiaID).toBe(0);
    expect(b.player().info.RichesOffer).toBe(0);

    a.c.out(129, (o) => { o.writeInt(2); });
    const dis = await a.c.code(129, 2);
    dis.pkt.readByte();
    expect(dis.pkt.readBoolean()).toBe(true);
    expect(a.player().info.ConsortiaID).toBe(0);
    const [c2] = await db.select().from(player.Consortia).where(eq(player.Consortia.ConsortiaID, cid));
    expect(c2!.IsExist).toBe(false);
  });
});
