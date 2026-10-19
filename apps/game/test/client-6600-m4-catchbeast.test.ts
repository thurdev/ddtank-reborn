/**
 * M4 `m4-catchbeast` (docs/plan/TASKS.md): Capturar Nian (`catchbeast.swf`, 145 ACTIVITY_SYSTEM sub 32-36,
 * `CatchBeastPackageType`). REAL C# logic exists — ver `game/catchbeast.ts` pro trail de citação completo.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import type { ServerContext } from "../src/session/context.js";
import { RoomType } from "../src/rooms/room.js";
import { onCatchBeastHurt, getOrCreate, persist } from "../src/game/catchbeast.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
let ctx: ServerContext;
beforeAll(async () => {
  // Pve_Info/NPC_Info/Mission_Info (missão real "Capturar Nian", id 1347): não está em helpers.ts
  // SEED_TABLES — seed local, mesmo padrão de client-6600-m4-resgate.test.ts.
  const h = await sharedDb();
  await seedDatabase(h, { only: ["Pve_Info", "NPC_Info", "Mission_Info"] });
  server = await startServer();
  ctx = (server as unknown as { ctx: ServerContext }).ctx;
});
afterAll(async () => {
  await server.stop();
});

describe("145 ACTIVITY_SYSTEM sub 32-36 CATCHBEAST", () => {
  it("sub 33 VIEWINFO: linha nova — challengeNum/buyBuffNum 1 (YearMonsterFightNum), 5 tiers trancados", async () => {
    const { c } = await loggedIn(server, { client: "6600", grade: 25 });
    const m = c.mark();
    c.out(145, (p) => p.writeByte(33));
    const r = await c.code(145, 33, m);
    r.pkt.readByte();
    expect(r.pkt.readInt()).toBe(1); // challengeNum
    expect(r.pkt.readInt()).toBe(1); // buyBuffNum
    expect(r.pkt.readInt()).toBe(300); // buffPrice (YearMonsterBuffMoney default)
    expect(r.pkt.readInt()).toBe(0); // damageNum
    const n = r.pkt.readInt();
    expect(n).toBe(5);
    const expectedTpl = [112370, 112371, 112372, 112373, 112374];
    const expectedDmg = [50_000, 300_000, 900_000, 1_500_000, 3_000_000];
    for (let i = 0; i < n; i++) {
      expect(r.pkt.readInt()).toBe(expectedTpl[i]);
      expect(r.pkt.readInt()).toBe(expectedDmg[i]);
      expect(r.pkt.readInt()).toBe(1); // locked
    }
    c.close();
  });

  it("sub 34 CHALLENGE sem arma equipada: recusa com Game.Server.SceneGames.NoEquip, não consome ChallengeNum", async () => {
    const { c, ch } = await loggedIn(server, { client: "6600", grade: 25, weapon: null });
    const m = c.mark();
    c.out(145, (p) => p.writeByte(34));
    const msg = await c.waitFor((r) => r.code === 3, 2000, m);
    expect(msg.pkt.readInt()).toBe(1);
    expect(msg.pkt.readString()).toBeTruthy();
    const gp = ctx.world.get(ch.userId)!;
    const row = await getOrCreate(ctx, gp);
    expect(row.ChallengeNum).toBe(1); // intacto
    c.close();
  });

  it("sub 34 CHALLENGE com arma: consome 1 ChallengeNum e cria sala PvE real (RoomType.CatchBeast, MapId 1347)", async () => {
    const { c, ch } = await loggedIn(server, { client: "6600", grade: 25 });
    c.out(145, (p) => p.writeByte(34));
    // 94/0 ROOM_CREATE (RoomMgr.createCatchBeastRoom -> room.addPlayer) prova que uma sala real foi criada.
    await c.waitFor((r) => r.code === 94 && r.sub === 0, 3000);
    const gp = ctx.world.get(ch.userId)!;
    expect(gp.currentRoom?.RoomType).toBe(RoomType.CatchBeast);
    expect(gp.currentRoom?.MapId).toBe(1347);
    const row = await getOrCreate(ctx, gp);
    expect(row.ChallengeNum).toBe(0); // 1 -> 0
    c.close();
  });

  it("sub 34 CHALLENGE sem ChallengeNum restante: nenhuma sala é criada", async () => {
    const { c, ch } = await loggedIn(server, { client: "6600", grade: 25 });
    const gp = ctx.world.get(ch.userId)!;
    const row = await getOrCreate(ctx, gp);
    await persist(ctx, gp, { ...row, ChallengeNum: 0 });
    c.out(145, (p) => p.writeByte(34));
    await new Promise((res) => setTimeout(res, 150));
    expect(gp.currentRoom).toBeNull();
    c.close();
  });

  it("sub 35 BUYBUFF: cobra YearMonsterBuffMoney em Money e devolve buyBuffNum novo (clamp em 0)", async () => {
    const { c, player: p, ch } = await loggedIn(server, { client: "6600", grade: 25, money: 10_000 });
    const before = p().info.Money;
    const m = c.mark();
    c.out(145, (pk) => { pk.writeByte(35); pk.writeBoolean(false); });
    const r = await c.code(145, 35, m);
    r.pkt.readByte();
    expect(r.pkt.readInt()).toBe(0); // 1 -> 0
    expect(p().info.Money).toBe(before - 300);
    // Comprar de novo: já em 0, não desce de 0 (mas a compra em si continua cobrando — ver game/catchbeast.ts)
    const m2 = c.mark();
    c.out(145, (pk) => { pk.writeByte(35); pk.writeBoolean(false); });
    const r2 = await c.code(145, 35, m2);
    r2.pkt.readByte();
    expect(r2.pkt.readInt()).toBe(0);
    expect(p().info.Money).toBe(before - 600);
    const gp = ctx.world.get(ch.userId)!;
    const row = await getOrCreate(ctx, gp);
    expect(row.BuyBuffNum).toBe(0);
    c.close();
  });

  it("sub 35 BUYBUFF: Money insuficiente não cobra nem responde", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", grade: 25, money: 100 });
    const m = c.mark();
    c.out(145, (pk) => { pk.writeByte(35); pk.writeBoolean(false); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 145 && r.sub === 35)).toBe(false);
    expect(p().info.Money).toBe(100);
    c.close();
  });

  it("onCatchBeastHurt: sobrescreve DamageNum (não acumula) e destrava os tiers alcançados", async () => {
    const { c, ch } = await loggedIn(server, { client: "6600", grade: 25 });
    const gp = ctx.world.get(ch.userId)!;
    await onCatchBeastHurt(ctx, gp, 900_000); // tier 0/1/2 (50k/300k/900k) destravados
    let row = await getOrCreate(ctx, gp);
    expect(row.DamageNum).toBe(900_000);
    expect(row.BoxState.split("-").map(Number)).toEqual([2, 2, 2, 1, 1]);
    await onCatchBeastHurt(ctx, gp, 10_000); // próxima luta: pior resultado — SOBRESCREVE pra baixo, nenhum tier trava de novo
    row = await getOrCreate(ctx, gp);
    expect(row.DamageNum).toBe(10_000);
    expect(row.BoxState.split("-").map(Number)).toEqual([1, 1, 1, 1, 1]);
    c.close();
  });

  it("sub 36 GETAWARD: dá a recompensa só quando o tier está claimable, claim-once (exploit do original fechado)", async () => {
    const { c, ch } = await loggedIn(server, { client: "6600", grade: 25 });
    const gp = ctx.world.get(ch.userId)!;
    await onCatchBeastHurt(ctx, gp, 3_000_000); // todos os 5 tiers claimable

    const before = gp.info.Gold;
    const m = c.mark();
    c.out(145, (pk) => { pk.writeByte(36); pk.writeInt(0); });
    const r = await c.code(145, 36, m);
    r.pkt.readByte();
    expect(r.pkt.readBoolean()).toBe(true);
    expect(r.pkt.readInt()).toBe(0);
    expect(gp.info.Gold).toBeGreaterThan(before); // recompensa própria (ouro, ver game/catchbeast.ts rewardsFor)

    // **Exploit evitado**: reclamar o MESMO tier de novo não dá a recompensa de novo (o C# original não
    // tinha esse guard — só conferia o threshold de dano, nunca o estado já "claimed").
    const goldAfterFirst = gp.info.Gold;
    const m2 = c.mark();
    c.out(145, (pk) => { pk.writeByte(36); pk.writeInt(0); });
    const r2 = await c.code(145, 36, m2);
    r2.pkt.readByte();
    expect(r2.pkt.readBoolean()).toBe(false);
    expect(gp.info.Gold).toBe(goldAfterFirst); // sem segunda recompensa

    // Um dano baixo que destrava SÓ o tier 0 recusa os tiers mais altos ainda trancados.
    const { c: c2, ch: ch2 } = await loggedIn(server, { client: "6600", grade: 25 });
    const gp2 = ctx.world.get(ch2.userId)!;
    await onCatchBeastHurt(ctx, gp2, 50_000); // só tier 0
    const m3 = c2.mark();
    c2.out(145, (pk) => { pk.writeByte(36); pk.writeInt(4); }); // tier 4 (3_000_000), bem acima
    const r3 = await c2.code(145, 36, m3);
    r3.pkt.readByte();
    expect(r3.pkt.readBoolean()).toBe(false);
    c2.close();
    c.close();
  });
});
