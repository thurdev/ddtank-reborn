import { describe, expect, it } from "vitest";
import { buildCreateLoginContent, getNameBySite, md5Hex, verifyCreateLoginContent } from "../src/index.js";

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
