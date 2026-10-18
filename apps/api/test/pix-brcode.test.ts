/**
 * BR Code (Pix "copia e cola", EMV MPM) — vetores conhecidos + validação estrutural.
 * `crc16ccitt` é testado contra o vetor de checagem oficial do catálogo CRC "CRC-16/CCITT-FALSE"
 * (poly 0x1021, init 0xFFFF, sem reflexão, xorout 0 — exatamente o algoritmo exigido pelo BACEN):
 * check("123456789") === 0x29B1. Esse é o vetor de referência mais usado pra validar implementações
 * desse algoritmo (ver https://reveng.sourceforge.io/crc-catalogue/16.htm#crc.cat.crc-16-ccitt-false).
 */
import { describe, expect, it } from "vitest";
import { buildBrCode, crc16ccitt, tlv, toAscii } from "../src/pix/brcode.js";

/** Parser TLV minimalista só pra teste: devolve {id: value} de um payload EMV bem formado. */
function parseTlv(payload: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    const value = payload.slice(i + 4, i + 4 + len);
    out[id] = value;
    i += 4 + len;
  }
  return out;
}

describe("crc16ccitt", () => {
  it("matches the official CRC-16/CCITT-FALSE check vector", () => {
    expect(crc16ccitt("123456789")).toBe("29B1");
  });

  it("is deterministic and sensitive to every byte", () => {
    expect(crc16ccitt("hello")).toBe(crc16ccitt("hello"));
    expect(crc16ccitt("hello")).not.toBe(crc16ccitt("hellp"));
  });

  it("empty string -> init value unchanged (0xFFFF)", () => {
    expect(crc16ccitt("")).toBe("FFFF");
  });
});

describe("tlv", () => {
  it("pads length to 2 digits and counts bytes, not characters", () => {
    expect(tlv("00", "01")).toBe("000201");
    // "São Paulo" tem 1 caractere multibyte (ã = 2 bytes em UTF-8) -> 10 bytes, não 9 caracteres.
    expect(tlv("60", "São Paulo")).toBe("6010São Paulo");
  });

  it("rejects values over 99 bytes", () => {
    expect(() => tlv("59", "x".repeat(100))).toThrow();
  });
});

describe("toAscii", () => {
  it("strips accents and non-ASCII characters", () => {
    expect(toAscii("São Paulo")).toBe("Sao Paulo");
    expect(toAscii("Olá, mundo! 🎮")).toBe("Ola, mundo!");
  });
});

describe("buildBrCode", () => {
  const base = { pixKey: "doacao@ddtank.local", merchantName: "DDTANK REBORN", merchantCity: "BRASIL", txid: "ABC123XYZ" };

  it("produces a well-formed EMV payload whose CRC validates", () => {
    const code = buildBrCode({ ...base, amountCents: 1000 });
    const withoutCrc = code.slice(0, -4); // tudo até e incluindo o cabeçalho "6304" do campo 63
    const crc = code.slice(-4);
    expect(withoutCrc.endsWith("6304")).toBe(true);
    expect(crc16ccitt(withoutCrc)).toBe(crc);
    expect(crc).toMatch(/^[0-9A-F]{4}$/);
  });

  it("round-trips every field through the TLV parser", () => {
    const code = buildBrCode({ ...base, amountCents: 2550 });
    const fields = parseTlv(code.slice(0, -8)); // tira "6304" + CRC antes de parsear
    expect(fields["00"]).toBe("01"); // Payload Format Indicator
    expect(fields["52"]).toBe("0000"); // Merchant Category Code
    expect(fields["53"]).toBe("986"); // BRL
    expect(fields["54"]).toBe("25.50"); // amountCents=2550 -> R$ 25,50
    expect(fields["58"]).toBe("BR");
    expect(fields["59"]).toBe("DDTANK REBORN");
    expect(fields["60"]).toBe("BRASIL");
    // Merchant Account Information (26) carries the GUI + Pix key as nested TLV.
    const merchantAccount = parseTlv(fields["26"]!);
    expect(merchantAccount["00"]).toBe("br.gov.bcb.pix");
    expect(merchantAccount["01"]).toBe(base.pixKey);
    // Additional Data Field Template (62) carries the reference label (txid) as nested TLV.
    const additional = parseTlv(fields["62"]!);
    expect(additional["05"]).toBe("ABC123XYZ");
  });

  it("omits the amount field when none is given (donor picks the amount in the banking app)", () => {
    const code = buildBrCode({ ...base });
    const fields = parseTlv(code.slice(0, -8));
    expect(fields["54"]).toBeUndefined();
  });

  it("falls back to '***' when the txid has no usable characters", () => {
    const code = buildBrCode({ ...base, txid: "---" });
    const fields = parseTlv(code.slice(0, -8));
    const additional = parseTlv(fields["62"]!);
    expect(additional["05"]).toBe("***");
  });

  it("sanitizes and truncates merchant name/city to ASCII within the spec's length limits", () => {
    const code = buildBrCode({ ...base, merchantName: "Associação Beneficente São José das Flores", merchantCity: "São Bernardo do Campo" });
    const fields = parseTlv(code.slice(0, -8));
    expect(fields["59"]!.length).toBeLessThanOrEqual(25);
    expect(fields["60"]!.length).toBeLessThanOrEqual(15);
    expect(fields["59"]).not.toMatch(/[^\x20-\x7e]/);
    expect(fields["60"]).not.toMatch(/[^\x20-\x7e]/);
  });
});
