# @ddt/protocol

A byte-exact TypeScript port of the DDTank 4.1 network layer. It covers the packet codec, checksum, rolling-key cipher, RSA login, stream framing and all packet codes.

The spec is the original C# server in `vendor/DDTank41` (Game.Base, Game.Server) and the fixed AS3 client in `vendor/DDTank41/Source Flash/src`. Each rule below cites the source it mirrors. Golden vectors generated **by the original C# source files** (`csharp-oracle/`) check every rule.

```ts
import { PacketOut, GSPacket, RollingKeyCipher, ServerFrameDecoder, encodeFrame, parseLoginPacket, Codes } from "@ddt/protocol";

const cipher = new RollingKeyCipher(true);                  // game clients: Encryted = true
const decoder = new ServerFrameDecoder({
  cipher,
  onPolicyRequest: () => socket.write(POLICY_RESPONSE),
  onPacket: (pkt) => {
    if (pkt.code === Codes.GameServer.ePackageType.LOGIN) {
      const login = parseLoginPacket(pkt, rsaPrivateKey);     // RSA PKCS#1 v1.5, pure BigInt
      cipher.setKey(login.payload!.key);                      // must happen synchronously, before the next frame
    }
  },
  onDisconnect: (reason) => socket.destroy(),
});
socket.on("data", (chunk) => decoder.push(chunk));             // TCP or WebSocket binary messages, any split

const out = new PacketOut(Codes.GameServer.ePackageType.SYS_MESSAGE);
out.writeInt(0); out.writeString("hello");
socket.write(encodeFrame(out, cipher));                        // header + checksum + encryption
```

---

## 1. Transport

* The transport is a byte stream: TCP, or WebSocket binary frames when Ruffle uses `socketProxy`. Packet boundaries have nothing to do with read boundaries. A read can hold half a packet or several packets.
* Every connection has an **8192-byte receive buffer**. A single socket read never returns more bytes than the buffer has free (`BaseClient.ReceiveAsyncImp`). If the buffer is ever full, the server disconnects ("buffer overflow").
* **In-band Flash policy** (`Game.Server/GameClient.cs` `OnRecv`): the game server checks this until it has received its first packet. If the *first byte of the receive buffer* is `'<'` (0x3C), the server sends `POLICY` and does **not** consume the bytes. The next read then overwrites them. The socket stays open; Flash closes it after reading the policy.
  `POLICY` = UTF-8 `<?xml version="1.0"?><!DOCTYPE cross-domain-policy SYSTEM "http://www.adobe.com/xml/dtds/cross-domain-policy.dtd"><cross-domain-policy><allow-access-from domain="*" to-ports="*" /></cross-domain-policy>` followed by `\0`.
  The request is `<policy-file-request/>\0` (23 bytes). This package exports `POLICY_REQUEST`, `POLICY_XML` and `POLICY_RESPONSE`. Inter-server sockets do not have this check (`policy: false`).
* Inter-server links use the same framing, unencrypted: Center 9202, Fighting 9208 (Game connects to both). Ruffle never sends policy requests over WebSocket.

## 2. Frame layout

All integers are **big-endian**.

| Off | Size | Field | Notes |
|---:|---:|---|---|
| 0 | u16 | magic `0x71AB` (29099) | `GSPacketIn.HEADER` |
| 2 | u16 | total length, header included | written as `(short)m_length`. The server accepts **20..8192** |
| 4 | u16 | checksum | see below |
| 6 | i16 | code | `ePackageType` etc. |
| 8 | i32 | clientId | player id; the server overwrites it with `Player.PlayerId` on receive (`GameClient.OnRecvPacket`) |
| 12 | i32 | parameter1 | AS3 `extend1` |
| 16 | i32 | parameter2 | AS3 `extend2` |
| 20 | … | body | |

### Checksum

```
sum = 119
for i in 6 .. length-1:  sum = (sum + byte[i]) & 0xFFFF     // C# short arithmetic, wraps
checksum = sum & 0x7F7F
```

The checksum is computed over the **plaintext**. It covers header bytes 6..19 (code, clientId, params) and the body, but not the checksum field itself. `GSPacketIn.WriteHeader` writes the header twice; only the second pass counts, and it gives this result. The AS3 `PackageOut.pack()` computes the same value.

* The 4.1 **server never verifies** inbound checksums.
* The **client drops** inbound packets whose checksum does not match (`ByteSocket.handlePackage`).

## 3. Body primitives (`Game.Base/PacketIn.cs`)

| C# method | Wire format | TS |
|---|---|---|
| `WriteByte/ReadByte` | u8 | `writeByte/readByte` |
| `WriteBoolean/ReadBoolean` | u8, `!= 0` | `writeBoolean/readBoolean` |
| `WriteShort/ReadShort` | i16 BE | `writeShort/readShort` |
| `WriteShortLowEndian/ReadShortLowEndian` | i16 **LE** | `…LowEndian` |
| `WriteInt/ReadInt`, `vmethod_0`/`ReadUInt` | i32/u32 BE | `writeInt/readInt`, `writeUInt/readUInt` |
| `WriteLong` | `[i32 bit32(v)][i32 low32(v)]`, **buggy** (see below) | `writeLong(bigint)` |
| `ReadLong` | `hi=i32, lo=u32`, `sign(hi)*(abs(hi*2^32)+lo)` in double | `readLong(): bigint` |
| `WriteFloat/ReadFloat` | f32 **little-endian** (`BitConverter`) | `writeFloat/readFloat` |
| `WriteDouble/ReadDouble` | f64 **little-endian** | `writeDouble/readDouble` |
| `WriteString(s)` | `u16(utf8Len+1)`, UTF-8 bytes, `00`. `null`/`""` becomes `00 01 00` | `writeString` |
| `WriteString(s, max)` | `u16(n)`, first `n=min(len,max)` UTF-8 bytes. No NUL; can cut a code point | `writeStringMax` |
| `ReadString` | `i16 count`, UTF-8 decode of `count` bytes, then **every `\0` is removed** | `readString` |
| AS3 `writeUTF` (client to server) | `u16 len`, UTF-8 bytes, no NUL. The server's `ReadString` accepts it | `writeUTF` |
| `WriteDateTime/ReadDateTime` | `i16 year, u8 month(1-12), u8 day, u8 hour, u8 minute, u8 second` (7 bytes). Reading validates like `new DateTime()` | `writeDateTime/readDateTimeParts/readDateTime` |
| `Write(byte[])`, `ReadBytes(n)`, `ReadBytes()` | raw. `ReadBytes()` returns everything up to `length` | `write/readBytes` |
| `Fill(v, n)` | `n` bytes of `v` | `fill` |

Behaviors this port reproduces exactly:

* **Over-reads.** Each received packet is copied into a fresh zeroed `byte[8192]`. Reading past the packet's `length` therefore returns zeros, not an error. Only a read past 8192 throws. `GSPacket.parse` copies this behavior. Handlers that read fields the client never sent get `0` / `""` / `false`, as in C#.
* **`WriteLong` bug.** The high word is built from `Convert.ToString(val, 2)` using `Substring(len-(i+1))`, which takes a suffix, not a single character. As a result, only **bit 32** of the value reaches the wire. Examples: `2^33` → `00000000 00000000`; `2^32+5` → `00000001 00000005`; `-1` → `00000001 ffffffff`. `writeLongTwosComplement` gives correct output for new code paths.
* **`ReadLong`** is not two's complement: `ff ff ff ff 00 00 00 01` → `-4294967297`. Above 2^53 it loses precision. On overflow it returns `long.MinValue`, as the original .NET Framework JIT does. (.NET 9+ saturates; this is the one golden vector where the oracle and the original runtime differ.)
* **Floats are little-endian** on the server, while AS3 `ByteArray` defaults to big-endian. This is the original behavior and it is what goes on the wire, so we keep it. `readFloatBE`/`writeFloatBE` exist for client-side code.
* **Strings.** Invalid UTF-8 decodes to U+FFFD per maximal subpart, and lone surrogates encode as `EF BF BD`. Both match .NET `Encoding.UTF8`.

### Nested packets

`WritePacket(inner)` appends a complete inner frame (header and checksum) to the body. `ReadPacket()` parses the rest of the body as a frame. Game, Center and Fighting use this to route packets to players (`SendPacketToPlayer`, code 32).

### Compression (`GSPacketIn.Compress`, `Marshal.Compress`)

Some codes have a zlib-deflated body: everything after byte 20, at level 9, as a standard zlib stream (`78 DA … adler32`), written by zlib.NET `ZOutputStream`. The header has no flag for this; the client handler for those codes calls `PackageIn.deCompress()` (`ByteArray.uncompress`). Two senders do this: `AbstractPacketLib.cs` around lines 1138 and 1819. Helpers: `compressPacket`, `uncompressPacket`, `compress`, `uncompress`. Node's zlib output is valid and inflates to identical data, but it is **not always byte-identical** to zlib.NET (for example, 2112 vs 2114 bytes on a 10 KB XML). Small payloads come out identical.

## 4. Encryption: rolling 8-byte key (4.1)

* K0 = `[174, 191, 86, 120, 171, 205, 239, 241]` (`StreamProcessor.KEY` = `ByteSocket.KEY`).
* Each side holds a **SEND key** and a **RECEIVE key** per connection. Both start at K0. The key is **mutated in place and carried from one packet to the next**, so each direction is an ordered stream. The byte index `i` restarts at 0 for every packet. Every operation is mod 256.

```
encrypt(p) -> c:   c[0] = p[0] ^ k[0]
                   for i >= 1:  k[i%8] = (k[i%8] + c[i-1]) ^ i
                                c[i]   = (p[i] ^ k[i%8]) + c[i-1]
decrypt(c) -> p:   p[0] = c[0] ^ k[0]
                   for i >= 1:  k[i%8] = (k[i%8] + c[i-1]) ^ i
                                p[i]   = (c[i] - c[i-1]) ^ k[i%8]
```

The sources are `PacketIn.CopyTo3` (server send), `CopyFrom3` and `StreamProcessor.decryptBytes` (server receive), `ByteSocket.send` (client send) and `PackageIn.loadE` (client receive). The server's `CopyTo3` encrypts in place across 8192-byte send-buffer refills. The output equals encrypting each whole packet in order, and the golden vectors check this for packets that straddle refills.

**Key exchange** (`GameSocketOut.sendLogin`, `UserLoginHandler`):
1. The client calls `resetKey()`, which sets both of its keys to K0, and sends LOGIN encrypted with K0.
2. Right **after** sending, the client calls `setKey(rnd8)` on both of its keys.
3. The server decrypts LOGIN with K0, RSA-decrypts the body, and calls `setKey(src[7..15])` on both of its keys. From then on both directions use `rnd8`.
4. `setKey` must run synchronously inside the packet callback. The next frame in the same read is decoded with the new key, exactly as in `ReceiveBytes`.

`BaseClient.Encryted` defaults to false, and only `GameClient` sets it to true. Inter-server sockets are plaintext. Use `new RollingKeyCipher(false)` or `NULL_CIPHER` for them. The cipher is behind the `FrameCipher` interface, so you can plug in another one. The FSM (`(2059198199, 1501)`, `state = (~state + adder) * mul; state ^= state >> 16`) is ported in `fsm.ts`, but 4.1 never uses its state for crypto.

## 5. Framing algorithm

### Server receive (`StreamProcessor.ReceiveBytes`, ported line by line in `ServerFrameDecoder`)

```
num = buffered + newBytes
if num < 20: keep everything, wait
cur = 0
loop:
  len = 0
  scanKey = clone(RECEIVE_KEY)            // cloned ONCE per scan; every failed attempt mutates it
  for (; cur + 4 < num; cur++):
     h = encrypted ? decryptBytes(buf, cur, 8, scanKey)[0..4] : buf[cur..cur+4]
     if h[0..2] == 0x71AB: len = u16(h[2..4]); break
  if (len == 0 or len >= 20) and len <= 8192:
     if num - cur >= len and len != 0:
        packet = decrypt(buf[cur..cur+len]) with the real RECEIVE_KEY; dispatch; cur += len; continue
     move buf[cur..num] to the front; wait for more        // also discards skipped junk; keeps <= 4 junk bytes
  else:
     drop the whole buffer; if Strict: Disconnect()          // Strict is true by default
while num - 1 > cur
if num - 1 == cur: keep that one byte
```

Quirks that the port reproduces and the golden vectors check:
* **Encrypted resync.** The scan key is not re-cloned for each offset, so in practice junk in front of encrypted data is never resynced past. Plaintext streams do resync.
* **The 8192-byte frame.** A frame of exactly 8192 bytes passes the length check, but `CopyFrom` refuses `count >= 8192`. A plaintext frame then arrives as an all-zero packet: code 0, length 0. An encrypted frame arrives raw and undecrypted, and the receive key does **not** advance, so the stream desyncs. Never send frames longer than 8191 bytes.
* **Scan overrun.** While scanning encrypted data near the end of a full buffer, `decryptBytes` reads `cur+7`. Past 8192 that throws, and the server disconnects.
* **Handler errors.** An exception thrown by a packet handler is caught and logged, and the next frame is still processed (`onHandlerError`).
* **Oversized length field.** The `(short)` cast means a frame over 32767 bytes would carry a negative length. Frames over 8192 bytes are rejected anyway.

### Client receive (`ByteSocket.readPackage`, `ClientFrameDecoder`)

The client scans for 0x71AB, decrypting the first 4 bytes with a **fresh** copy of the key at each offset. It reads the length as u16 and does no range check. It waits for the whole frame, decrypts it with the real key, and drops the frame if the checksum does not match.

### Send

`encodeFrame(pkt, cipher)` = `writeHeader()` (length and checksum), then encryption with the send key. This is byte-identical to `SendTCP` → `AsyncTcpSendCallback`/`CopyTo3`.

## 6. RSA login

* **Client key.** `DDT.as` hardcodes a 1024-bit RSA public key: a base64 modulus `zRSdzFcn…NLc=` and exponent `AQAB`. The client encrypts with hurlant `RSAKey.encrypt`, which is PKCS#1 v1.5 type 2. A message longer than k−11 bytes is split into several blocks; the server can only decrypt one. `BigInteger.toArray` drops leading zero bytes, so about 1/256 of ciphertexts are 127 bytes long. The .NET server probably rejected those. **We left-pad them instead**, a deliberate and harmless deviation.
* **Server key.** `WorldMgr.RsaCryptor.FromXmlString(GameServer config "PrivateKey")` holds a .NET `<RSAKeyValue>` key, and the server calls `Decrypt(data, fOAEP: false)`. The key is configurable here: `parseDotNetRsaXml`, `toDotNetRsaXml`, `rsaKeyFromPem` and `generateRsaKey(1024)`. `clientPublicKeyStrings(key)` returns the two base64 strings to patch into the SWF. A 128-byte modulus is 172 base64 characters, the same length as the original. Decryption is pure BigInt: Node blocks PKCS#1 v1.5 `privateDecrypt` without `--security-revert`, and we don't use that flag.
* **LOGIN (code 1)** body: `i32 Version.Build`, `i32 desktopType`, then RSA ciphertext up to the end. If `clientType == 69` the server ignores the packet. The plaintext layout:

  | Off | Size | Field |
  |---:|---:|---|
  | 0 | 7 | client UTC date: `i16 year, u8 month, u8 day, u8 h, u8 m, u8 s` (never checked) |
  | 7 | 8 | new rolling key → `setKey` |
  | 15 | … | UTF-8 `"user,password"`. `Split(',')` must give exactly 2 parts |

* **Inter-server.** Center and Fighting send `RSAKey` (code 0): body = modulus (128 bytes) + exponent. Game answers with code 1: body = `RSA(UTF-8 "serverid,name")`. After that the server sets `Strict = false`. Helpers: `buildInterServerRsaKeyPacket`, `parseInterServerRsaKeyPacket`, `buildInterServerLoginPacket`, `parseInterServerLoginPacket`.

## 7. Packet codes

`scripts/extract-codes.ts` parses the original sources and generates `src/codes/*.ts`. The output keeps the original names and order, as `as const` objects plus a value-union type. Run `pnpm --filter @ddt/protocol extract-codes`.

| Module | Export | Source |
|---|---|---|
| `game-server.ts` | `Codes.GameServer.*`: `ePackageType` (main client↔server codes), `GameRoomPackageType`, `eRoomPackageType`, `ConsortiaPackageType`, `PetPackageType`, `FarmPackageType`, `MarryCmdType`, `HotSpringCmdType`, `eChatServerPacket`, … | `Game.Server/**` |
| `game-logic.ts` | `Codes.GameLogic.eTankCmdType` (GAME_CMD = 91 sub-codes), `eFightPackageType` (Game↔Fighting), `ePackageTypeLogic` | `Game.Logic/**` |
| `center-server.ts` | `Codes.CenterServer.ePackageType` (Game↔Center) | `Center.Server/ePackageType.cs` |
| `bussiness.ts` | `Codes.Bussiness.eEventPacket` | `Bussiness/Protocol` |
| `client.ts` | `Codes.Client.*`: the AS3 `ePackageType`, `CrazyTankPackageType`, `GameRoomPackageType`, … (static consts in `*PackageType.as`) | `Source Flash/src` |

The script selects every C# enum whose name contains `Package|Packet|Cmd`, plus every enum in `Game.Server/Packets/*.cs`. It also takes every AS3 class named `*PackageType|*PackageInType|*CmdType`. Each generated object carries a JSDoc header with the source file:line and lists aliased (duplicate) values. `src/codes/manifest.json` lists everything. `Codes.codeName(obj, value)` and `Codes.codeNames(obj, value)` do reverse lookup. **The client is fixed**, so when the server and client disagree, `Codes.Client` wins for client-facing codes.

## 8. Verification (`csharp-oracle/`)

`csharp-oracle/` is a .NET 10 console app. It compiles **verbatim copies** of `Game.Base/PacketIn.cs`, `Packets/GSPacketIn.cs`, `Packets/StreamProcessor.cs`, `BaseClient.cs`, `Base/Packets/FSM.cs` and `Marshal.cs` (with `zlib.net.dll`). Only log4net and protobuf-net are stubbed, and neither affects the wire. The app drives the real `ReceiveBytes`, `CopyTo3`, `WriteHeader` and `Write*/Read*` code and writes `test/golden/vectors.json`, seeded so the output is reproducible:

```
pnpm --filter @ddt/protocol oracle        # regenerate golden vectors (needs dotnet 10 SDK)
pnpm --filter @ddt/protocol test          # vitest: golden + random-split/property tests
pnpm --filter @ddt/protocol sync-oracle-sources   # re-copy the C# sources from vendor/
```

The vectors cover:
* every primitive, including edge values;
* `ReadLong` and `ReadString` decoding;
* 61 checksums;
* encrypted and plain send streams, including ones that straddle the 8192-byte send buffer;
* 20 receive scenarios: random splits, byte-by-byte delivery, junk, bad lengths, partial tails, the 8191 and 8192 frames, and encrypted junk;
* FSM;
* RSA login: decrypting .NET ciphertexts, plus full sessions where the key switches mid-stream;
* the inter-server RSAKey packet;
* zlib.
