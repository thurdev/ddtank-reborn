import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { buildLoginPacket, GSPacket, parseLoginPacket } from "@ddt/protocol";
import { readRsaKeyText, testConfig } from "../src/config.js";
import { parseRsaKey } from "../src/server.js";
import { LanguageMgr } from "../src/util/lang.js";
import { sharedDb, startServer } from "./helpers.js";

describe("config", () => {
  it("dev key = vendor Web.config pair (same source as apps/api) and decrypts a client LOGIN", async () => {
    const text = readRsaKeyText(testConfig())!;
    const { existsSync } = await import("node:fs");
    if (!text && !existsSync("../../vendor/DDTank41/Tank.Request/Web.config")) return; // vendor/ absent in this checkout
    expect(text).toBeTruthy();
    const key = parseRsaKey(text);
    const pkt = buildLoginPacket({ publicKey: key, user: "alice", password: "abcdef", key: [1, 2, 3, 4, 5, 6, 7, 8] });
    const parsed = parseLoginPacket(GSPacket.parse(pkt.encode()), key);
    expect(parsed.payload?.user).toBe("alice");
    expect(parsed.payload?.password).toBe("abcdef");
  });

  it("refuses DEV_ALLOW_ANY_TICKET in production", async () => {
    const { loadConfig } = await import("../src/config.js");
    expect(() => loadConfig({ NODE_ENV: "production", DEV_ALLOW_ANY_TICKET: "true" })).toThrow();
  });

  it("LanguageMgr: first ':' splits, last duplicate wins, {n} formatting, missing -> id", () => {
    const l = new LanguageMgr();
    l.load("﻿a.b:x:y\n#c:z\nk:1 {0} {1}\nk:2 {0}\n");
    expect(l.t("a.b")).toBe("x:y");
    expect(l.t("c")).toBe("c");
    expect(l.t("k", 7)).toBe("2 7");
  });

  // ch-tabela: SERVER_ID é o id do canal (player."Server_List"."ID") que este processo apps/game serve — default 4
  // ("Reborn", seed) preserva o comportamento de hoje; um segundo canal (ch-processo, ainda não implementado) só
  // precisa de um SERVER_ID diferente apontando pra outra linha.
  describe("SERVER_ID selects the channel row (player.\"Server_List\")", () => {
    let servers: Awaited<ReturnType<typeof startServer>>[] = [];
    afterEach(async () => {
      await Promise.all(servers.map((s) => s.stop()));
      servers = [];
      const h = await sharedDb();
      await h.db.execute(sql`DELETE FROM player."Server_List" WHERE "ID" = 77`);
    });

    it("default SERVER_ID (4) keeps reading the seeded \"Reborn\" channel", async () => {
      const server = await startServer();
      servers.push(server);
      expect(server.ctx.templates.server?.ID).toBe(4);
      expect(server.ctx.templates.server?.Name).toBe("Reborn");
      expect(server.ctx.zoneId).toBe(server.ctx.templates.server?.ZoneId);
    });

    it("a second channel row (ID 77) is picked up when SERVER_ID=77", async () => {
      const h = await sharedDb();
      await h.db.execute(sql`INSERT INTO player."Server_List"
        ("ID","Name","State","Online","Total","Room","MustLevel","LowestLevel","NewerServer","ZoneId","ZoneName")
        VALUES (77, 'Canal 2', 2, 0, 321, 55, 0, 0, false, 1077, 'Canal 2')
        ON CONFLICT ("ID") DO NOTHING`);
      const server = await startServer({ SERVER_ID: "77" });
      servers.push(server);
      expect(server.ctx.templates.server?.ID).toBe(77);
      expect(server.ctx.templates.server?.Name).toBe("Canal 2");
      expect(server.ctx.zoneId).toBe(1077);
      expect(server.ctx.zoneName).toBe("Canal 2");
      expect(server.ctx.rooms.rooms.length).toBe(55);
    });
  });
});
