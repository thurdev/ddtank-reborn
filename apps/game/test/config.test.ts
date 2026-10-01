import { describe, expect, it } from "vitest";
import { buildLoginPacket, GSPacket, parseLoginPacket } from "@ddt/protocol";
import { readRsaKeyText, testConfig } from "../src/config.js";
import { parseRsaKey } from "../src/server.js";
import { LanguageMgr } from "../src/util/lang.js";

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
});
