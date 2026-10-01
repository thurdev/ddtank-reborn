/**
 * Compares the TS port against golden vectors produced by csharp-oracle, which runs the ORIGINAL
 * DDTank 4.1 Game.Base sources (PacketIn, GSPacketIn, StreamProcessor, BaseClient, FSM, Marshal).
 */
import { describe, expect, it } from "vitest";
import {
  buildInterServerRsaKeyPacket,
  ByteBuffer,
  compress,
  compressPacket,
  computeChecksum,
  DEFAULT_KEY,
  encodeFrame,
  FSM,
  GSPacket,
  PacketOut,
  parseDotNetRsaXml,
  parseLoginPacket,
  parseLoginPayload,
  RollingKeyCipher,
  rsaDecryptPkcs1,
  ServerFrameDecoder,
  toDotNetRsaXml,
  uncompress,
  type DisconnectReason,
  type RsaPrivateKey,
} from "../src/index.js";
import { concat, golden, hex, unhex } from "./helpers.js";

const G = golden();

function applyOp(p: ByteBuffer, kind: string, v: unknown): void {
  switch (kind) {
    case "byte": return p.writeByte(v as number);
    case "bool": return p.writeBoolean(v as boolean);
    case "short": return p.writeShort(v as number);
    case "shortLE": return p.writeShortLowEndian(v as number);
    case "int": return p.writeInt(v as number);
    case "uint": return p.writeUInt(v as number);
    case "long": return p.writeLong(BigInt(v as string));
    case "float": return p.writeFloat(v as number);
    case "double": return p.writeDouble(v as number);
    case "string": return p.writeString(v as string | null);
    case "stringMax": { const [s, n] = v as [string, number]; return p.writeStringMax(s, n); }
    case "date": { const [year, month, day, hour, minute, second] = v as number[]; return p.writeDateTime({ year: year!, month: month!, day: day!, hour: hour!, minute: minute!, second: second! }); }
    case "bytes": return p.write(unhex(v as string));
    case "fill": { const [b, n] = v as [number, number]; return p.fill(b, n); }
    default: throw new Error(kind);
  }
}

describe("golden: primitives (PacketIn.Write*)", () => {
  for (const c of G.primitives) {
    it(c.name, () => {
      const p = new PacketOut(c.code, c.clientId, c.p1, c.p2);
      for (const [kind, v] of c.ops) applyOp(p, kind, v);
      expect(hex(p.encode())).toBe(c.bytes);
    });
  }

  it("reads back what was written (strings / dates / floats)", () => {
    const c = G.primitives.find((x: { name: string }) => x.name === "strings");
    const p = GSPacket.parse(unhex(c.bytes));
    for (const [kind, v] of c.ops) {
      if (kind === "string") expect(p.readString()).toBe(((v as string | null) ?? "").replaceAll("\0", "").toWellFormed());
      if (kind === "stringMax") {
        const len = p.readShort();
        expect(len).toBe(Math.min(new TextEncoder().encode(v[0]).length, v[1]));
        p.skip(len);
      }
    }
    expect(p.offset).toBe(p.length);
  });
});

describe("golden: reads (PacketIn.Read*)", () => {
  it("ReadLong reproduces the double-based reconstruction", () => {
    for (const c of G.reads.longReads) {
      const v = new ByteBuffer(unhex(c.bytes), 8).readLong();
      // The oracle runs on .NET 10, which saturates (long)double; the original ran on .NET Framework,
      // whose x86/x64 conversion yields long.MinValue on overflow. We mirror .NET Framework.
      const expected = c.value === "9223372036854775807" ? -9223372036854775808n : BigInt(c.value);
      expect(v, c.bytes).toBe(expected);
    }
  });

  it("ReadString strips NULs and replaces invalid UTF-8 like .NET", () => {
    for (const c of G.reads.stringReads) {
      const b = new ByteBuffer(unhex(c.bytes), unhex(c.bytes).length);
      const s = b.readString();
      expect(Array.from(s, (ch) => ch).join(""), c.bytes).toBe(c.value);
      expect([...s].flatMap((ch) => (ch.length === 2 ? [ch.charCodeAt(0), ch.charCodeAt(1)] : [ch.charCodeAt(0)]))).toEqual(c.codepoints);
      expect(b.offset).toBe(c.offset);
    }
  });

  it("ReadFloat/ReadDouble (little-endian), ReadDateTime, ReadShortLowEndian, ReadUInt, ReadBoolean", () => {
    for (const c of G.reads.misc) {
      const bytes = unhex(c.bytes);
      const b = new ByteBuffer(bytes, bytes.length);
      expect(b.readFloat()).toBe(c.f1);
      expect(b.readFloat()).toBe(c.f2);
      expect(b.readDouble()).toBe(c.d);
      const d = b.readDateTimeParts();
      expect([d.year, d.month, d.day, d.hour, d.minute, d.second]).toEqual(c.date);
      expect(b.readShortLowEndian()).toBe(c.shortLE);
      expect(b.readUInt()).toBe(c.u);
      expect(b.readBoolean()).toBe(c.flag);
    }
  });
});

describe("golden: header + checksum (GSPacketIn.WriteHeader/checkSum)", () => {
  it(`${G.checksums.length} packets`, () => {
    for (const c of G.checksums) {
      const p = new PacketOut(c.code, c.clientId, c.p1, c.p2);
      p.write(unhex(c.body));
      const bytes = p.encode();
      expect(hex(bytes)).toBe(c.bytes);
      expect(computeChecksum(bytes)).toBe(c.checksum);
      const back = GSPacket.parse(bytes);
      expect([back.code, back.clientId, back.parameter1, back.parameter2, back.length]).toEqual([c.code, c.clientId, c.p1, c.p2, bytes.length]);
      expect(back.verifyChecksum()).toBe(true);
    }
  });
});

describe("golden: server send path (StreamProcessor.SendTCP + PacketIn.CopyTo3)", () => {
  for (const c of G.send) {
    it(c.name, () => {
      const cipher = new RollingKeyCipher(c.encrypted, unhex(c.key));
      const wire = concat(c.packets.map((p: string) => encodeFrame(GSPacket.parse(unhex(p)), cipher)));
      expect(hex(wire)).toBe(c.wire);
      expect(hex(cipher.sendKey)).toBe(c.keyAfter);
    });
  }
});

type Ev = { type: string; code?: number; clientId?: number; p1?: number; p2?: number; length?: number; bytes?: string };

function packetEvent(p: GSPacket): Ev {
  const n = Math.min(Math.max(p.length, 0), p.buffer.length);
  return { type: "packet", code: p.code, clientId: p.clientId, p1: p.parameter1, p2: p.parameter2, length: p.length, bytes: hex(p.buffer.subarray(0, n)) };
}

function disconnectEvent(r: DisconnectReason): Ev {
  return { type: r === "buffer-overflow" ? "overflow" : "disconnect" };
}

describe("golden: server receive path (StreamProcessor.ReceiveBytes)", () => {
  for (const c of G.recv) {
    it(c.name, () => {
      const events: Ev[] = [];
      const cipher = new RollingKeyCipher(c.encrypted, unhex(c.key));
      const dec = new ServerFrameDecoder({
        cipher,
        policy: false, // BaseClient itself has no policy logic (that lives in GameClient)
        onPacket: (p) => events.push(packetEvent(p)),
        onDisconnect: (r) => events.push(disconnectEvent(r)),
      });
      const wire = unhex(c.wire);
      let o = 0;
      for (const n of c.chunks) {
        dec.push(wire.subarray(o, o + n));
        o += n;
      }
      expect(events).toEqual(c.events);
      expect(hex(cipher.receiveKey)).toBe(c.keyAfter);
      expect(dec.size).toBe(c.pending);
      expect(hex(dec.pending())).toBe(c.pendingBytes);
    });
  }
});

describe("golden: FSM", () => {
  it("state sequences", () => {
    for (const c of G.fsm) {
      const f = new FSM(c.adder, c.multiplier);
      const states = [f.getState()];
      for (let i = 0; i < 20; i++) states.push(f.updateState());
      expect(states).toEqual(c.states);
    }
  });
});

describe("golden: RSA login (UserLoginHandler)", () => {
  const key = parseDotNetRsaXml(G.rsa.privateKeyXml) as RsaPrivateKey;

  it("parses and re-serializes the .NET <RSAKeyValue> XML byte-for-byte", () => {
    expect(toDotNetRsaXml(key)).toBe(G.rsa.privateKeyXml);
  });

  it("decrypts RSACryptoServiceProvider.Encrypt(fOAEP:false) ciphertexts", () => {
    for (const c of G.rsa.logins) {
      const plain = rsaDecryptPkcs1(key, unhex(c.ciphertext));
      expect(hex(plain)).toBe(c.plaintext);
      const payload = parseLoginPayload(plain);
      expect(hex(payload.key)).toBe(c.key);
      expect(payload.user).toBe(c.user);
      expect(payload.password).toBe(c.pass);
    }
  });

  it("full session: LOGIN under K0, setKey, then packets under the new key", () => {
    for (const s of G.rsa.sessions) {
      const events: Ev[] = [];
      const cipher = new RollingKeyCipher(true, DEFAULT_KEY);
      const dec = new ServerFrameDecoder({
        cipher,
        policy: false,
        onPacket: (p) => {
          events.push(packetEvent(p));
          if (p.code === 1) {
            const login = parseLoginPacket(p, key);
            cipher.setKey(login.payload!.key);
          }
        },
        onDisconnect: (r) => events.push(disconnectEvent(r)),
      });
      const wire = unhex(s.wire);
      let o = 0;
      for (const n of s.chunks) {
        dec.push(wire.subarray(o, o + n));
        o += n;
      }
      expect(events).toEqual(s.events);
      expect(hex(cipher.receiveKey)).toBe(s.recvKeyAfter);
    }
  });

  it("inter-server RSAKey packet (code 0: modulus + exponent)", () => {
    expect(hex(buildInterServerRsaKeyPacket(key).encode())).toBe(G.rsa.interServerRsaKeyPacket);
  });
});

describe("golden: zlib (Marshal.Compress / GSPacketIn.Compress)", () => {
  it("inflates zlib.NET output", () => {
    for (const c of G.zlib.marshal) expect(hex(uncompress(unhex(c.compressed)))).toBe(c.input);
  });

  it("deflate output is a valid stream; byte-identical for small inputs", () => {
    for (const c of G.zlib.marshal) {
      const out = compress(unhex(c.input));
      expect(hex(uncompress(out))).toBe(c.input);
      if (c.input.length < 4000) expect(hex(out)).toBe(c.compressed);
    }
  });

  it("GSPacketIn.Compress()", () => {
    const p = new PacketOut(66, 42);
    p.writeInt(7);
    p.writeString("compressed body " + "z".repeat(200));
    compressPacket(p);
    expect(hex(p.encode())).toBe(G.zlib.packet.after);
  });
});
