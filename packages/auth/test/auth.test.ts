import { describe, expect, it } from "vitest";
import { createDb, migrateDb } from "@ddt/db";
import { buildCreateLoginContent, consumeWebKey, getNameBySite, issueWebKey, md5Hex, validateGameLogin, verifyCreateLoginContent } from "../src/index.js";

describe("CreateLogin md5 content (BaseInterface.UnEncryptLogin)", () => {
  it("round-trips and rejects tampering", () => {
    const c = buildCreateLoginContent("alice", "3F2504E0-4F89-11D3-9A0C-0305E82C3301", 1700000000, "SECRET");
    expect(c.split("|")[3]).toBe(md5Hex("alice3F2504E0-4F89-11D3-9A0C-0305E82C33011700000000SECRET"));
    expect(verifyCreateLoginContent(c, "SECRET")).toMatchObject({ ok: true, name: "alice" });
    expect(verifyCreateLoginContent(c.replace("alice", "bob"), "SECRET")).toEqual({ ok: false, code: 5 });
    expect(verifyCreateLoginContent("a|b", "SECRET")).toEqual({ ok: false, code: 2 });
    expect(verifyCreateLoginContent(c, "")).toEqual({ ok: false, code: 4 });
    expect(verifyCreateLoginContent(c, "SECRET", { maxAgeSec: 60, now: 1700000100 })).toEqual({ ok: false, code: 7 });
  });
  it("GetNameBySite", () => {
    expect(getNameBySite("u", "a", { a: "k" })).toBe("a_u");
    expect(getNameBySite("u", "b", { a: "k" })).toBe("u");
  });
});

// M1 client detection (docs/plan/MIGRACAO-6600.md, research/6600/packets-m1.md): Login.ashx (apps/api) calls
// consumeWebKey with `client` ("41"/"6600" from ReqCtx.client); apps/game reads it back via validateGameLogin
// to pick the packet layout. Default "41" when the caller never passes one (old behaviour, zero regression).
describe("consumeWebKey client tagging (app.LoginSessions.Client)", () => {
  it("records the client the web key was issued/consumed for, default 41", async () => {
    const h = await createDb("pglite:memory");
    await migrateDb(h);
    const { key } = await issueWebKey(h, "Alice6600");
    const session = await consumeWebKey(h, "Alice6600", key, "tempPwd1", { client: "6600" });
    expect(session?.Client).toBe("6600");
    const validated = await validateGameLogin(h, "Alice6600", "tempPwd1");
    expect(validated?.Client).toBe("6600");

    const { key: key2 } = await issueWebKey(h, "Bob41");
    const session2 = await consumeWebKey(h, "Bob41", key2, "tempPwd2");
    expect(session2?.Client).toBe("41");
  });
});
