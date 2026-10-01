import { describe, expect, it } from "vitest";
import {
  buildInterServerLoginPacket,
  buildLoginPacket,
  ClientFrameDecoder,
  Codes,
  DEFAULT_KEY,
  encodeFrame,
  generateRsaKey,
  GSPacket,
  NULL_CIPHER,
  PacketOut,
  parseInterServerLoginPacket,
  parseLoginPacket,
  POLICY_REQUEST,
  POLICY_RESPONSE,
  RollingKeyCipher,
  rsaDecryptPkcs1,
  rsaEncryptPkcs1,
  ServerFrameDecoder,
  type DisconnectReason,
} from "../src/index.js";
import { concat, hex, randBytes, randInt, randomSplit, rng } from "./helpers.js";

function randomPackets(r: () => number, count: number, maxBody: number): PacketOut[] {
  return Array.from({ length: count }, () => {
    const p = new PacketOut(randInt(r, 0, 511), randInt(r, -(2 ** 31), 2 ** 31 - 1), randInt(r, -1000, 1000), randInt(r, 0, 9));
    p.write(randBytes(r, randInt(r, 0, maxBody)));
    return p;
  });
}

describe("ServerFrameDecoder: random splits", () => {
  for (const encrypted of [false, true]) {
    it(`${encrypted ? "encrypted" : "plain"}: 200 rounds, chunk sizes 1..max`, () => {
      const r = rng(encrypted ? 7 : 3);
      for (let round = 0; round < 200; round++) {
        const packets = randomPackets(r, randInt(r, 1, 12), randInt(r, 0, 1) ? 40 : 3000);
        const plains = packets.map((p) => p.encode());
        const sender = new RollingKeyCipher(encrypted);
        const wire = concat(plains.map((p) => sender.encryptFrame(p)));
        const recv = new RollingKeyCipher(encrypted);
        const got: string[] = [];
        let disc: DisconnectReason | undefined;
        const dec = new ServerFrameDecoder({ cipher: recv, policy: false, onPacket: (p) => got.push(hex(p.toBytes())), onDisconnect: (d) => (disc = d) });
        for (const chunk of randomSplit(r, wire, randInt(r, 1, 20000))) dec.push(chunk);
        expect(disc).toBeUndefined();
        expect(got).toEqual(plains.map(hex));
        expect(dec.size).toBe(0);
        expect(hex(recv.receiveKey)).toBe(hex(sender.sendKey));
      }
    });
  }

  it("parsed packets expose header fields and zero-filled over-reads like the C# 8192 buffer", () => {
    const p = new PacketOut(91, 1234, 5, 6);
    p.writeInt(-7);
    const got: GSPacket[] = [];
    const dec = new ServerFrameDecoder({ onPacket: (x) => got.push(x), policy: false });
    dec.push(encodeFrame(p));
    const q = got[0]!;
    expect([q.code, q.clientId, q.parameter1, q.parameter2, q.length, q.offset]).toEqual([91, 1234, 5, 6, 24, 20]);
    expect(q.readInt()).toBe(-7);
    expect(q.readInt()).toBe(0); // past the end of the packet, still inside the 8192 buffer
    expect(q.readString()).toBe("");
  });

  it("Strict: bad length disconnects; non-strict silently drops the buffer", () => {
    const bad = new Uint8Array([0x71, 0xab, 0x00, 0x05, ...new Array(20).fill(0)]);
    let reason: DisconnectReason | undefined;
    new ServerFrameDecoder({ onPacket: () => {}, policy: false, onDisconnect: (d) => (reason = d) }).push(bad);
    expect(reason).toBe("bad-length");
    let reason2: DisconnectReason | undefined;
    const dec = new ServerFrameDecoder({ strict: false, onPacket: () => {}, policy: false, onDisconnect: (d) => (reason2 = d) });
    dec.push(bad);
    expect(reason2).toBeUndefined();
    expect(dec.size).toBe(0);
  });

  it("handler exceptions are isolated (C#: logged, next packet still processed)", () => {
    const seen: number[] = [];
    const errors: unknown[] = [];
    const dec = new ServerFrameDecoder({
      policy: false,
      onPacket: (p) => {
        seen.push(p.code);
        if (p.code === 1) throw new Error("boom");
      },
      onHandlerError: (e) => errors.push(e),
    });
    dec.push(concat([encodeFrame(new PacketOut(1)), encodeFrame(new PacketOut(2))]));
    expect(seen).toEqual([1, 2]);
    expect(errors).toHaveLength(1);
  });
});

describe("policy-file request (GameClient.OnRecv)", () => {
  it("answers <policy-file-request/>\\0 before the first packet and keeps working afterwards", () => {
    let policies = 0;
    const got: number[] = [];
    const cipher = new RollingKeyCipher(true);
    const dec = new ServerFrameDecoder({ cipher, onPacket: (p) => got.push(p.code), onPolicyRequest: () => policies++ });
    dec.push(POLICY_REQUEST);
    expect(policies).toBe(1);
    expect(dec.size).toBe(0);
    const client = new RollingKeyCipher(true);
    dec.push(client.encryptFrame(new PacketOut(4).encode()));
    expect(got).toEqual([4]);
    // after the first packet '<' is just data
    dec.push(new Uint8Array([60, 60, 60]));
    expect(policies).toBe(1);
  });

  it("policy answer bytes are the exact GameClient.POLICY string", () => {
    const s = new TextDecoder().decode(POLICY_RESPONSE);
    expect(s.startsWith('<?xml version="1.0"?><!DOCTYPE cross-domain-policy')).toBe(true);
    expect(s.endsWith("</cross-domain-policy>\0")).toBe(true);
    expect(POLICY_REQUEST.length).toBe(23);
  });

  it("can be disabled (inter-server sockets)", () => {
    let policies = 0;
    const dec = new ServerFrameDecoder({ policy: false, onPacket: () => {}, onPolicyRequest: () => policies++ });
    dec.push(POLICY_REQUEST);
    expect(policies).toBe(0);
  });
});

describe("ClientFrameDecoder (AS3 ByteSocket) <-> server encoder", () => {
  it("decodes server frames under random splits and verifies checksums", () => {
    const r = rng(99);
    const serverCipher = new RollingKeyCipher(true);
    const clientCipher = new RollingKeyCipher(true);
    const packets = randomPackets(r, 300, 500);
    const wire = concat(packets.map((p) => encodeFrame(p, serverCipher)));
    const got: string[] = [];
    let bad = 0;
    const dec = new ClientFrameDecoder({ cipher: clientCipher, onPacket: (p) => got.push(hex(p.toBytes())), onChecksumError: () => bad++ });
    for (const c of randomSplit(r, wire, 700)) dec.push(c);
    expect(bad).toBe(0);
    expect(got).toEqual(packets.map((p) => hex(p.toBytes())));
  });

  it("drops packets with a wrong checksum", () => {
    const bytes = new PacketOut(3).encode();
    bytes[5] ^= 1;
    let ok = 0;
    let bad = 0;
    const dec = new ClientFrameDecoder({ onPacket: () => ok++, onChecksumError: () => bad++ });
    dec.push(bytes);
    expect([ok, bad]).toEqual([0, 1]);
  });
});

describe("login key exchange end-to-end (TS client <-> TS server)", () => {
  const key = generateRsaKey(1024);

  it("LOGIN under K0, both sides switch to the new key", () => {
    const r = rng(5);
    const newKey = randBytes(r, 8);
    // client
    const clientCipher = new RollingKeyCipher(true);
    clientCipher.resetKey();
    const login = buildLoginPacket({ publicKey: key, user: "admin", password: "tok3n", key: newKey, version: 5498 });
    const w1 = encodeFrame(login, clientCipher);
    clientCipher.setKey(newKey); // GameSocketOut.sendLogin: setKey AFTER sending
    const w2 = encodeFrame(new PacketOut(Codes.GameServer.ePackageType.PING), clientCipher);
    // server
    const serverCipher = new RollingKeyCipher(true);
    const seen: string[] = [];
    const dec = new ServerFrameDecoder({
      cipher: serverCipher,
      onPacket: (p) => {
        if (p.code === Codes.GameServer.ePackageType.LOGIN) {
          const l = parseLoginPacket(p, key);
          expect(l.version).toBe(5498);
          seen.push(`${l.payload!.user}:${l.payload!.password}`);
          serverCipher.setKey(l.payload!.key);
        } else seen.push(`code ${p.code}`);
      },
    });
    for (const c of randomSplit(r, concat([w1, w2]), 9)) dec.push(c);
    expect(seen).toEqual(["admin:tok3n", `code ${Codes.GameServer.ePackageType.PING}`]);
    // server -> client under the new key
    const back = encodeFrame(new PacketOut(Codes.GameServer.ePackageType.SYS_DATE), serverCipher);
    const got: number[] = [];
    new ClientFrameDecoder({ cipher: clientCipher, onPacket: (p) => got.push(p.code) }).push(back);
    expect(got).toEqual([Codes.GameServer.ePackageType.SYS_DATE]);
  });

  it("RSA PKCS#1 v1.5 round trip, short (leading-zero-stripped) ciphertexts and bad padding", () => {
    const msg = new TextEncoder().encode("hello,world");
    const c = rsaEncryptPkcs1(key, msg);
    expect(c.length).toBe(128);
    expect(rsaDecryptPkcs1(key, c)).toEqual(msg);
    let stripped: Uint8Array | undefined;
    for (let i = 0; i < 4000 && !stripped; i++) {
      const x = rsaEncryptPkcs1(key, msg);
      if (x[0] === 0) stripped = x.subarray(1);
    }
    if (stripped) expect(rsaDecryptPkcs1(key, stripped)).toEqual(msg);
    const tampered = c.slice();
    tampered[127] ^= 0xff;
    expect(() => rsaDecryptPkcs1(key, tampered)).toThrow();
  });

  it("inter-server login (code 1 = RSA(\"serverid,name\"))", () => {
    const pkt = GSPacket.parse(buildInterServerLoginPacket(key, "1,Server01").encode());
    expect(parseInterServerLoginPacket(pkt, key)).toEqual(["1", "Server01"]);
  });
});

describe("primitive round trips", () => {
  it("all read/write pairs", () => {
    const p = new PacketOut(1);
    p.writeByte(200);
    p.writeBoolean(true);
    p.writeShort(-12345);
    p.writeShortLowEndian(-2);
    p.writeInt(-123456789);
    p.writeUInt(0xfedcba98);
    p.writeLong(4294967301n);
    p.writeFloat(1.25);
    p.writeDouble(-2.5e100);
    p.writeString("Olá, 弹弹堂");
    p.writeUTF("as3");
    p.writeDateTime({ year: 2026, month: 2, day: 28, hour: 23, minute: 59, second: 1 });
    p.writeFloatBE(3.5);
    const q = GSPacket.parse(p.encode());
    expect(q.readByte()).toBe(200);
    expect(q.readBoolean()).toBe(true);
    expect(q.readShort()).toBe(-12345);
    expect(q.readShortLowEndian()).toBe(-2);
    expect(q.readInt()).toBe(-123456789);
    expect(q.readUInt()).toBe(0xfedcba98);
    expect(q.readLong()).toBe(4294967301n);
    expect(q.readFloat()).toBe(1.25);
    expect(q.readDouble()).toBe(-2.5e100);
    expect(q.readString()).toBe("Olá, 弹弹堂");
    expect(q.readString()).toBe("as3");
    expect(q.readDateTimeParts()).toEqual({ year: 2026, month: 2, day: 28, hour: 23, minute: 59, second: 1 });
    expect(q.readFloatBE()).toBe(3.5);
    expect(q.offset).toBe(q.length);
  });

  it("WriteLong keeps only bit 32 of the high word (original bug)", () => {
    const p = new PacketOut(1);
    p.writeLong(2n ** 33n + 7n);
    expect(GSPacket.parse(p.encode()).readLong()).toBe(7n);
  });

  it("invalid DateTime throws like new DateTime(...)", () => {
    const p = new PacketOut(1);
    p.writeDateTime({ year: 2025, month: 2, day: 29, hour: 0, minute: 0, second: 0 });
    expect(() => GSPacket.parse(p.encode()).readDateTimeParts()).toThrow();
  });

  it("nested packets (WritePacket/ReadPacket)", () => {
    const inner = new PacketOut(91, 7, 8, 9);
    inner.writeString("x");
    const outer = new PacketOut(32, 1001);
    outer.writePacket(inner);
    const back = GSPacket.parse(outer.encode()).readPacket();
    expect([back.code, back.clientId, back.parameter1, back.parameter2]).toEqual([91, 7, 8, 9]);
    expect(back.readString()).toBe("x");
  });

  it("NULL_CIPHER is a pass-through", () => {
    const b = new PacketOut(5).encode();
    expect(encodeFrame(GSPacket.parse(b), NULL_CIPHER)).toEqual(b);
    expect(DEFAULT_KEY).toEqual([174, 191, 86, 120, 171, 205, 239, 241]);
  });
});

describe("packet codes", () => {
  it("server and client agree on core codes", () => {
    const S = Codes.GameServer.ePackageType;
    const C = Codes.Client.ePackageType;
    expect([S.LOGIN, S.SYS_MESSAGE, S.PING, S.RSAKEY, S.GAME_CMD, S.GAME_ROOM]).toEqual([1, 3, 4, 7, 91, 94]);
    expect([C.LOGIN, C.GAME_CMD, C.GAME_ROOM]).toEqual([S.LOGIN, S.GAME_CMD, S.GAME_ROOM]);
    expect(Codes.codeName(S, 91)).toBe("GAME_CMD");
    expect(Codes.GameLogic.eTankCmdType.ADD_LIVING).toBe(0x40);
    expect(Codes.GameLogic.eFightPackageType.RSAKey).toBe(0);
    expect(Codes.CenterServer.ePackageType.RSAKey).toBe(0);
  });
});
