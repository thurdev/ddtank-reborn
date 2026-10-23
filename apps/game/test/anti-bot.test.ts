/**
 * 41-captcha-anti-bot: 200 CHECK_CODE emit side (game/anti-bot.ts, game/check-code-image.ts).
 * Real trigger counters (`countFunction`/`countFunction2`/`countAddMoney`/`countAddGP`) are set directly
 * to a value past every possible random-threshold roll (see `game/anti-bot.ts` randInt ranges) so
 * `isPassCheckCode` always fails deterministically — no RNG seeding needed, no flakiness.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import type { ServerContext } from "../src/session/context.js";
import { antiBotEnabled, handleCheckCodeAnswer, isPassCheckCode, showCheckCode } from "../src/game/anti-bot.js";
import { generateCheckCode, renderCheckCodeImage } from "../src/game/check-code-image.js";
import { loggedIn, startServer } from "./helpers.js";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("game/check-code-image.ts: hand-rolled PNG encoder (no canvas/native dependency)", () => {
  it("generateCheckCode: 4 digits 0-9 (Bussiness.CheckCode.GenerateCheckCode)", () => {
    const code = generateCheckCode(() => 0.999);
    expect(code).toMatch(/^\d{4}$/);
  });

  it("renderCheckCodeImage: well-formed PNG (signature + IHDR dimensions match code.length*30 x 32)", () => {
    const png = renderCheckCodeImage("4071", () => 0.5);
    expect([...png.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
    expect(png.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(4 * 30);
    expect(png.readUInt32BE(20)).toBe(32);
  });
});

let server: GameServer;
let ctx: ServerContext;
beforeAll(async () => { server = await startServer(); ctx = (server as unknown as { ctx: ServerContext }).ctx; });
afterAll(async () => { await server.stop(); });

describe("200 CHECK_CODE: off by default (Server_Config AntiBotCheckCodeEnabled)", () => {
  it("isPassCheckCode always true while disabled, even with every counter maxed out", async () => {
    expect(antiBotEnabled(ctx)).toBe(false);
    const { c, ch: p } = await loggedIn(server);
    const gp = ctx.world.get(p.userId)!;
    gp.countFunction = gp.countFunction2 = gp.countAddMoney = gp.countAddGP = 999_999;
    gp.info.CheckCount = 5;
    expect(isPassCheckCode(ctx, gp)).toBe(true);
    c.close();
  });
});

describe("200 CHECK_CODE: enabled (GamePlayer.isPassCheckCode/ShowCheckCode/CheckCodeHandler ports)", () => {
  async function enable<T>(fn: () => Promise<T>): Promise<T> {
    ctx.templates.serverConfig.set("AntiBotCheckCodeEnabled", "1");
    try { return await fn(); } finally { ctx.templates.serverConfig.set("AntiBotCheckCodeEnabled", "0"); }
  }

  it("isPassCheckCode fails once a counter passes its random threshold; showCheckCode pushes a real challenge (byte 1 = first offense)", () => enable(async () => {
    const { c, ch: p } = await loggedIn(server);
    const gp = ctx.world.get(p.userId)!;
    gp.countFunction = 1000; // past the max possible roll for CountFunction (randInt(7,10) -> at most 9)
    expect(isPassCheckCode(ctx, gp)).toBe(false);
    const mark = c.mark();
    showCheckCode(gp);
    const r = await c.code(200, undefined, mark);
    expect(r.pkt.readByte()).toBe(1); // CheckError 0 -> first-offense sub-byte
    expect(r.pkt.readBoolean()).toBe(true); // backType: a challenge follows
    expect(r.pkt.readByte()).toBe(1);
    expect(r.pkt.readString()).toBe("hi");
    const png = r.pkt.readBytes();
    expect([...png.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
    expect(gp.info.CheckCount).toBe(1);
    expect(gp.checkCode).not.toBe("baodeptrai");
    c.close();
  }));

  it("wrong answer: CheckCount/CheckError++, re-shown with sub-byte 2 (repeat offender), does not reset the trigger counters", () => enable(async () => {
    const { c, ch: p } = await loggedIn(server);
    const gp = ctx.world.get(p.userId)!;
    gp.countFunction = 1000;
    showCheckCode(gp);
    await c.code(200, 1); // wait for the initial challenge to actually land before marking (send() is async)
    expect(gp.info.CheckError).toBe(0);
    const mark = c.mark();
    c.out(200, (o) => o.writeString("0000-wrong-on-purpose"));
    const r = await c.code(200, 2, mark); // CheckError just became 1 -> sub-byte 2
    r.pkt.readByte(); // sub byte (already matched as 2 above)
    expect(r.pkt.readBoolean()).toBe(true); // backType true: a fresh challenge follows
    expect(gp.info.CheckError).toBe(1);
    // CheckCount++ on the wrong attempt is immediately overwritten back to 1 by the re-shown ShowCheckCode
    // (GamePlayer.cs:1220 `CheckCount = 1`, unconditional) — same net effect ported here.
    expect(gp.info.CheckCount).toBe(1);
    expect(gp.checkCode).not.toBe("baodeptrai"); // fresh challenge pending again
    expect(gp.countFunction).toBe(1000); // resetPassCode only runs on a CORRECT answer
    c.close();
  }));

  it("correct answer: acks with backType false, resets CheckCount/checkCode and every trigger counter", () => enable(async () => {
    const { c, ch: p } = await loggedIn(server);
    const gp = ctx.world.get(p.userId)!;
    gp.countFunction = gp.countAddMoney = 1000;
    showCheckCode(gp);
    await c.code(200, 1); // wait for the initial challenge to actually land before marking (send() is async)
    const code = gp.checkCode;
    const mark = c.mark();
    c.out(200, (o) => o.writeString(code.toUpperCase())); // case-insensitive, CheckCodeHandler.cs:25
    const ack = await c.code(200, 1, mark);
    ack.pkt.readByte(); // sub byte (already matched as 1 above)
    expect(ack.pkt.readBoolean()).toBe(false); // backType false: client just closes the popup
    expect(gp.checkCode).toBe("baodeptrai");
    expect(gp.info.CheckCount).toBe(0);
    expect(gp.countFunction).toBe(0);
    expect(gp.countAddMoney).toBe(0);
    c.close();
  }));

  it('"cheat" string disconnects immediately (CheckCodeHandler.cs:19-24)', () => enable(async () => {
    const { c, ch: p } = await loggedIn(server);
    const gp = ctx.world.get(p.userId)!;
    gp.countFunction = 1000;
    showCheckCode(gp);
    c.out(200, (o) => o.writeString("cheat"));
    await c.waitClosed(3000);
  }));

  it("9+ prior wrong answers (CheckError>=9): the next wrong answer disconnects instead of re-showing", () => enable(async () => {
    const { c, ch: p } = await loggedIn(server);
    const gp = ctx.world.get(p.userId)!;
    gp.countFunction = 1000;
    showCheckCode(gp);
    gp.info.CheckError = 9; // simulates the account's lifetime count already maxed (never resets, GamePlayer.cs persisted)
    c.out(200, (o) => o.writeString("still-wrong"));
    await c.waitClosed(3000);
  }));

  it("nothing pending (checkCode is the \"baodeptrai\" sentinel): an unsolicited answer is a pure no-op", async () => {
    const { c, ch: p } = await loggedIn(server);
    const gp = ctx.world.get(p.userId)!;
    expect(gp.checkCode).toBe("baodeptrai");
    expect(() => handleCheckCodeAnswer(ctx, gp, "0000")).not.toThrow();
    expect(gp.info.CheckCount).toBe(0);
    c.close();
  });

  it("real wiring: bolsa/mover.ts gates every move INTO the workbench (Store bag) the same way (UserChangeItemPlaceHandler.cs:49-55)", () => enable(async () => {
    const { c, ch: p } = await loggedIn(server, { weapon: 7001 });
    const gp = ctx.world.get(p.userId)!;
    gp.countFunction2 = 1000; // past the max possible roll for CountFunction2 (randInt(40,60) -> at most 59)
    const mark = c.mark();
    // 49 CHANGE_PLACE_GOODS: EquipBag(0) slot 6 (main weapon) -> Store(12) slot 0 — challenge shown, move never applied.
    c.out(49, (o) => { o.writeByte(0); o.writeInt(6); o.writeByte(12); o.writeInt(0); o.writeInt(0); o.writeBoolean(false); });
    const r = await c.code(200, undefined, mark);
    expect(r.pkt.readByte()).toBe(1);
    expect(gp.equipBag.getItemAt(6)).not.toBeNull(); // the weapon never actually moved
    c.close();
  }));
});
