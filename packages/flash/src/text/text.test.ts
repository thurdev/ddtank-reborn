import { describe, expect, it } from "vitest";
import { parseFlashHtml } from "./html";
import { StyleSheet } from "./StyleSheet";
import { TextFormat } from "./TextFormat";

describe("TextFormat", () => {
  it("converte strings vindas do XML de layout (pickgliss)", () => {
    const f = new TextFormat();
    (f as any).size = "14";
    (f as any).letterSpacing = "2";
    (f as any).color = "0xFFCC00";
    (f as any).bold = "false";
    (f as any).font = "null";
    expect(f.size).toBe(14);
    expect(f.letterSpacing).toBe(2);
    expect(f.color).toBe(0xffcc00);
    expect(f.bold).toBe(false);
    expect(f.font).toBeNull();
  });
});

describe("parseFlashHtml", () => {
  it("empilha e fecha tags de formato", () => {
    const runs = parseFlashHtml("a<b>b<font color='#FF0000'>c</font></b>d", new TextFormat(), false, true);
    expect(runs.map((r) => [r.text, r.fmt.bold, r.fmt.color])).toEqual([
      ["a", null, null], ["b", true, null], ["c", true, 0xff0000], ["d", null, null],
    ]);
  });

  it("aplica StyleSheet por tag e por classe", () => {
    const css = new StyleSheet();
    css.parseCSS("a { color: #00FF00; } .big { font-size: 20px; font-weight: bold }");
    const runs = parseFlashHtml("<a href='x'>l</a><span class='big'>B</span><foo class='big'>C</foo>!", new TextFormat(), false, true, css);
    expect(runs.map((r) => [r.text, r.fmt.color, r.fmt.size, r.fmt.bold])).toEqual([
      ["l", 0x00ff00, null, null], ["BC", null, 20, true], ["!", null, null, null],
    ]);
    expect(css.getStyle(".big")).toEqual({ fontSize: "20px", fontWeight: "bold" });
  });

  it("aceita tags próprias com dígito (chat: <CT0>)", () => {
    const css = new StyleSheet();
    css.setStyle("CT0", { color: "#ffcc00", fontSize: "13" });
    const runs = parseFlashHtml("<CT0>[Atual]</CT0> oi", new TextFormat(), false, true, css);
    expect(runs.map((r) => [r.text, r.fmt.color, r.fmt.size])).toEqual([["[Atual]", 0xffcc00, 13], [" oi", null, null]]);
  });
});

describe("decodeText", () => {
  it("respeita BOM UTF-16 como o Flash", async () => {
    const { decodeText } = await import("../utils/ByteArray");
    const le = new Uint8Array([0xff, 0xfe, 0x4f, 0, 0xe9, 0]);
    expect(decodeText(le)).toBe("Oé");
    expect(decodeText(new TextEncoder().encode("﻿abc"))).toBe("abc");
  });
});
