# 04 — DDTank protocol and existing rewrites

Researched 2026-10-01. Sources are GitHub (via `gh`) and web search. RaGEZONE answered WebFetch with HTTP 403, so I only saw its thread titles in search results. Raw code excerpts, each headed with its source URL, are in `research/protocol-excerpts/`:

| File | Contents |
|---|---|
| `ddtank41-client-ByteSocket-PackageIn-PackageOut.as.txt` | AS3 client socket, framing, crypto, checksum (full files) |
| `ddtank41-server-packet-framing-crypto.cs.txt` | C# `GSPacketIn`, `PacketIn`, `StreamProcessor`, `BaseClient` (full) |
| `ddtank41-login-flow.txt` | client `sendLogin`, hardcoded RSA pubkey, `UserLoginHandler`, `CreateLogin.aspx`, `Login.ashx`, `LoginSelectList.ashx`, zlib helpers, `config.xml` |
| `ddtank41-packet-enums.txt` | `ePackageType` (server and client), `eFightPackageType`, Center `ePackageType`, `CrazyTankPackageType` (GAME_CMD sub-codes), `GameRoomPackageType` |
| `ddtank-physics.txt` | `BombObject`, `EulerVector`, `Living` shoot loop, `SimpleBomb.StartMoving`, `Tile` (.map format), `Map`, `MapMgr.LoadMap`, wind, `BallInfo` |
| `ddtserver-legacy-fsm-protocol.cs.txt` | the older 2.x protocol variant, which uses an FSM keystream instead of the 8-byte rolling key |
| `ddtank41-request-ashx-list.txt` | list of every `.ashx` handler in 4.1 `Tank.Request` |

---

## 1. Existing reimplementations and remakes

**Main finding: no public, working DDTank/Gunny server exists in a language other than C#.** Every runnable server in public repos is a copy of the leaked 7Road .NET Framework codebase: Center, Road/Game, Fighting, Tank.Request, SQL Server. A Node/TS port would be the first of its kind, so we have nothing in our language to borrow from.

### 1a. Server attempts in languages other than C#

| Repo | Lang | What it is | Completeness | License | Last push |
|---|---|---|---|---|---|
| [LucasCampMat/ddtank-java-server](https://github.com/LucasCampMat/ddtank-java-server) | Java (Spring and Netty) | One `GameServerHandler` with a switch over opcodes, plus JPA repositories | Toy. **Wrong protocol**: it uses header 0x77aa, a 6-byte header and a made-up XOR key `6e3a5673422b495a`, and looks AI-generated. Do not use it as a reference. | none | 2026-05 |
| [guinhx/bomb-me](https://github.com/guinhx/bomb-me) | **TypeScript (Node)** with NestJS and Knex/SQLite | Server for **"Bomb Me" / DDTank Brazil mobile** (Cocos2d-x Lua client by Proficient City). Not the Flash protocol. | Early stage. It has a server list, news, mocked OTP login, a TCP server skeleton, packet class, rooms, and a Lua asset crypt tool. Its packet header is 8 bytes **little-endian** (`sign,len,blockHash,protoCode`) with optional compression. | none | 2026-07 |
| [ichisadashioko/ddtank-netcore](https://github.com/ichisadashioko/ddtank-netcore) | C# ASP.NET Core | Empty scaffold for porting Tank.Request to .NET Core | about 0% | none | 2020-05 |
| [ProgramTraveler/dandantang](https://github.com/ProgramTraveler/dandantang) | Java | "Java web game similar to 弹弹堂" | Empty repo | none | 2021 |
| [Captain32/JAVA-game-platform](https://github.com/Captain32/JAVA-game-platform), [love-in-cpp/DDT-simple-version](https://github.com/love-in-cpp/DDT-simple-version), [iwxyi/DDT](https://github.com/iwxyi/DDT) | Java / Java / C++ | Student clones of 弹弹堂 with their own protocols | Toys, not compatible | none | 2019–2022 |
| [ceastld/tan-hall](https://github.com/ceastld/tan-hall) | JS (browser) | "弹堂 TAN HALL", an *original* turn-based artillery game with its own design docs | Single-player web game, unrelated protocol | none | 2026-08 |

### 1b. Client remakes (HTML5, Unity, Cocos)

- **None for the Flash DDTank client.** The only non-Flash official client is the 7Road/Proficient City **mobile DDTank** ("DDTank Nostalgia" / "Bomb Me"), a Cocos2d-x Lua app. [tohru48/ddtank-re-toolkit](https://github.com/tohru48/ddtank-re-toolkit) (Node, no license, 2026-05) decodes its asset pipeline: `.ddt` is a 15-byte header and footer around a custom LZ4 frame (`F8 8B 2B` + u32 LE size), and the textures are `MNG?` plus ETC2 PVR3. [guinhx/bomb-me](https://github.com/guinhx/bomb-me) is working toward a server for it.
- [erdongcong/clip-2d-terrain-demo](https://github.com/erdongcong/clip-2d-terrain-demo) (Unity C#, 2019) only demonstrates 弹弹堂-style destructible terrain.
- **Running the original SWF in a modern browser:** [BrunoSzczuk/ddtank-5.5-mac-silicon](https://github.com/BrunoSzczuk/ddtank-5.5-mac-silicon) (2026-05) wraps the 5.5 C# server in Docker/Mono. It runs SQL Server on 1433, Center on 2008/2009/9202, Fighting on 9208, Road on 9200, and the site on 8080. It puts **websockify WebSocket-to-TCP bridges** in front of each socket server and embeds **Ruffle** with `socketProxy`. **Ruffle's AS3 support is not good enough yet**: the Loading splash renders, but the pickgliss `UIModuleLoader` (`Loader.loadBytes` + `ApplicationDomain`) stalls. The working path today is the Flash Player 32 projector loading `Loading.swf?user=..&key=..&config=http://host/config.xml`.
- Launchers that embed Flash: [1415ddfer/ZeroHelper](https://github.com/1415ddfer/ZeroHelper) (C++), [felixmaker/ddtank-rs](https://github.com/felixmaker/ddtank-rs) (Rust, MIT, 2023; a login tool with Lua login scripts for 7k7k, 4399 and 7road web portals), [HaiHai-17/Source-Launcher](https://github.com/HaiHai-17/Source-Launcher), and the Electron launcher in AloneInAbyss.

### 1c. C# source trees that matter for protocol work

These are listed only for protocol extraction. The other agent owns choosing which C# source to port.

| Repo | Version | Notes | Last push |
|---|---|---|---|
| [pnkl1999/DDTank41](https://github.com/pnkl1999/DDTank41) (★87; fork bachduyhoang/DDTank) | 4.1 | Has **both** the C# server and the decompiled AS3 client (`Source Flash/src`), so every excerpt above comes from one consistent version. No license. | 2024-07 |
| [AloneInAbyss/ddtank-server-files-remake](https://github.com/AloneInAbyss/ddtank-server-files-remake) | 4.1 (fork of the above) | Adds **Portuguese docs**: `DOCUMENTACAO-COMBATE.md` (combat, turn order, delay formula `1600 - 1200*Agi/(Agi+1200) + Atk/10`, turn timers, Fighting tick of 40 ms, Road↔Fighting on 9208), plus `GUIA-SUBIR-SERVIDOR.md` and others. Worth reading. | 2026-09 |
| [SkelletonX/DDTank4.1](https://github.com/SkelletonX/DDTank4.1) / Winter0507 | 4.1 | MIT label, but it is leaked code. Has a wiki. | 2022-04 |
| [zsj0613/DDTServer](https://github.com/zsj0613/DDTServer) | about 2.x/3.x (Chinese) | Older **FSM crypto** variant, NVelocity, its own Web.Server | 2020-05 |
| [tohru48/DDT-6600](https://github.com/tohru48/DDT-6600) | 6.6 | Server and Flash project; adds many sub-protocol enums (Horse, Dice, MagicHouse…) | 2026-01 |
| [geniushuai/DDTank-3.0](https://github.com/geniushuai/DDTank-3.0), [GunnyII/BaseGunnyII](https://github.com/GunnyII/BaseGunnyII) | 3.0 / Gunny II (VN) | 2012–2013 originals. `GSPacketIn` is identical between 2.6 and 3.0. | 2012–13 |

Forums: RaGEZONE has [DDTank](https://forum.ragezone.com/community/ddtank.816/), [Developments](https://forum.ragezone.com/community/ddtank-developments.817/) and [Releases](https://forum.ragezone.com/community/ddtank-releases.818/) sections, and a ["DDtank Socket"](https://forum.ragezone.com/threads/ddtank-socket.1201549/) thread about packet structure and keys. All returned 403 to automated fetch, so check them by hand. Searches for Gitee and Chinese blogs about 弹弹堂 protocol analysis found nothing usable.

---

## 2. Network protocol (as of 4.1; verified against the client and the server)

### 2.1 Transport

- Plain TCP. The game server is Road/Game on port 9200 by default. Center and Fighting are internal servers, but they use the same framing.
- **Flash socket policy:** if the first byte received is `'<'` (0x3C, i.e. `<policy-file-request/>`), the server replies with the cross-domain-policy XML plus a NUL byte (`GameClient.cs`, `POLICY`). A Node port must do this on the game port itself, and optionally on 843.

### 2.2 Packet header (20 bytes, **big-endian**)

| Off | Type | Field |
|---|---|---|
| 0 | u16 | magic `0x71AB` (29099) |
| 2 | u16 | total length including the header (server accepts 20..8192) |
| 4 | u16 | checksum |
| 6 | i16 | packet code (`ePackageType`) |
| 8 | i32 | clientId (the player or living ID, used for routing) |
| 12 | i32 | parameter1 / extend1 (often the living ID in GAME_CMD) |
| 16 | i32 | parameter2 / extend2 |

- **Checksum** = `(119 + Σ bytes[6..len)) & 0x7F7F`, computed over the plaintext. The client silently drops inbound packets whose checksum is wrong. The 4.1 server does *not* verify inbound checksums; the 2.x server does.
- Common top-level codes: LOGIN=1, KIT_USER=2, SYS_MESSAGE=3, PING=4, SYS_DATE=5, RSAKEY=7, GAME_CMD=91 (combat; the first int of the body is a `CrazyTankPackageType` sub-code), GAME_ROOM=94 (the first int is a `GameRoomPackageType` sub-code). See `ddtank41-packet-enums.txt`. **Codes vary between versions** (compare the 2.x enum in the legacy file), so pin one client version.

### 2.3 Body primitives (AS3 `ByteArray` default endianness, which is BE)

- `byte`/`bool` take 1 byte. `short` is i16 BE and `int` is i32 BE. `long` is an i32 high word plus a u32 low word.
- **String, server to client:** u16 length = utf8 byte count **+ 1**, then the UTF-8 bytes, then `0x00`. The client reads it with `readUTF()`.
- **String, client to server:** the client's `writeUTF` writes u16 length + UTF-8 bytes with no NUL. The server's `ReadString` strips `\0`.
- **DateTime** takes 7 bytes: u16 year, u8 month (1–12), u8 day, u8 hour, u8 minute, u8 second.
- **Floats:** the C# side uses `BitConverter`, which is **little-endian**, while AS3 reads BE. Check any packet that carries a float or double.
- **Compression:** some large server packets call `GSPacketIn.Compress()`, which zlib-deflates the body after the 20-byte header at level 9 (zlib.net `ZOutputStream`, which gives a standard zlib stream). The client handler for those codes calls `pkg.deCompress()` (`ByteArray.uncompress`). Nothing in the header marks a packet as compressed; whether a packet is compressed depends on its code. In Node this is `zlib.deflateSync` / `zlib.inflateSync`.

### 2.4 Encryption (4.1: rolling 8-byte key)

- Both sides start with `K0 = [174,191,86,120,171,205,239,241]` and keep separate SEND and RECV key arrays. **Key state carries over from one packet to the next**: each array is mutated in place, packet after packet, so both directions are ordered streams. The byte index `i` restarts at 0 for each packet.
- Encrypt one packet (p = plaintext, c = ciphertext, k = key array, all arithmetic mod 256):
  `c[0] = p[0] ^ k[0]`; for `i ≥ 1`: `k[i%8] = (k[i%8] + c[i-1]) ^ i`, then `c[i] = (p[i] ^ k[i%8]) + c[i-1]`.
- Decrypt: `p[0] = c[0] ^ k[0]`; for `i ≥ 1`: `k[i%8] = (k[i%8] + c[i-1]) ^ i`, then `p[i] = (c[i] - c[i-1]) ^ k[i%8]`.
- To find a packet boundary, the receiver decrypts the first 4 bytes using a **clone** of the RECV key, checks for 0x71AB, and reads the length. It then decrypts the whole packet with the **real** key.
- **Key exchange:** on connect the client calls `resetKey()` (back to K0) and sends LOGIN encrypted with K0. Immediately after sending, it calls `setKey(rnd8)` on both its SEND and RECV keys. The server decrypts LOGIN with K0, RSA-decrypts the body, and calls `setKey(src[7..15])` on both of its keys. From then on both directions start from rnd8. The C# server's `CopyTo3` contains complicated code for partial sends; Node does not need it, because it can encrypt the whole packet before `socket.write`.
- **Older variant (2.x, DDTServer):** an XOR keystream from an FSM: `state = (~state + adder) * mul; state ^= state >> 16`, with per-byte key `((key++) & 0xFF0000) >> 16` starting at `state`. The state advances once per packet. Seed values are `(2059198199, 1501)`. After login, adder = `(src[7]<<8)+src[8]` and mul = client version. The 4.1 client still contains the FSM class, but it no longer uses it.

### 2.5 RSA and the LOGIN packet

- The client has a **hardcoded 1024-bit RSA public key** in `DDT.as`: base64 modulus `zRSdzFcn…NLc=`, exponent `AQAB`. It uses hurlant `RSAKey.encrypt`, which is PKCS#1 v1.5 type 2. The private key is the .NET XML `<RSAKeyValue>` in the server's config (`appSettings["privateKey"]`, and `WorldMgr.RsaCryptor` on Game). It is decrypted with `fOAEP=false`. **We need the private key that matches the client, or we must patch the modulus in the SWF.**
- LOGIN (code 1) body: `i32 Version.Build`, `i32 clientType` (desktopType; 69 means skip), then the RSA ciphertext of
  `[u16 yearUTC][u8 mon][u8 day][u8 h][u8 m][u8 s]` + `8 random key bytes` + UTF-8 `"user,password"`.
- The server splits the string on `,`, rejects the user if already logged in (`LoginMgr.ContainsUser`), calls `BaseInterface.LoginGame`, which goes to `CenterServiceClient.ValidateLoginAndGetID` (WCF to Center), then creates the `GamePlayer` and calls `LoginServer.SendAllowUserLogin`. Errors are sent with `SendKitoff` and the connection is closed.

### 2.6 Full login flow

1. **Portal site** (PHP/ASPX, `Db_Membership`) authenticates the user and creates a one-time key. It calls `Request/CreateLogin.aspx?content=user|key|time|md5(user+key+time+LoginKey)&site=…`. The md5 output is lowercase hex, and `LoginKey` is a shared secret from appSettings, optionally per site as `LoginKey_<site>`. Request stores `name -> key` in its in-memory `PlayerManager` and responds `0` on success.
2. **Browser** loads `Loading.swf` with flashvars `user`, `key` (this becomes the "password"), `config` (URL of `config.xml`), and optionally `rid`. `config.xml` gives `FLASHSITE`, `SITE` (resources), `REQUEST_PATH`, `LOGIN_PATH`, `FILL_PATH`, `POLICY_FILES` and feature flags.
3. **Flash calls `Login.ashx?p=`** with base64 RSA of `7-byte date + "user,key,newKey,nickname"`. The server creates or activates the player in `Db_Tank` and registers `newKey` with Center (`CreatePlayer(id,name,newPwd)`). It returns `<Result value="true" message=".."><Item ID NickName Sex Style Colors GP Gold Money ... /></Result>`. The `PlayerManager.Login` check is **commented out in 4.1**, which is a security hole; we should enforce it. `LoginSelectList.ashx?username=` lists the characters on the account.
4. **Socket:** the client connects to the Road server (IP and port come from `ServerList.ashx`), handles the policy exchange, and sends LOGIN with `"user,newKey"`. The Game server validates it against Center.

### 2.7 HTTP request handlers (`Tank.Request/*.ashx`)

- Every handler returns `<Result value="true|false" message="…">…children…</Result>` as `text/plain` XML.
- **Static data** (templates) is pre-built by `CreateAllXml.ashx` into `*.xml` files that are **zlib-compressed bytes** (`StaticFunction.Compress`, level 9). The client fetches them with `CompressRequestLoader`, which calls `ByteArray.uncompress()`. The pre-built set covers: ActiveList, BallList, LoadMapsItems, LoadPVEItems, QuestList, TemplateAllList (ItemTemplate), ShopItemList, LoadItemsCategory, ItemStrengthenList, MapServerList, ConsortiaLevelList, DailyAwardList, NPCInfoList, LoginAwardItemTemplate, serverconfig, ShopGoodsShowList, newtitle, pet* templates, CardUpdate*, suit*, DailyLeague*. CelebList/* ranking files are built the same way by `CreateAllCeleb`.
- **Dynamic handlers** (Login, LoginSelectList, ServerList, AuctionPageList, Consortia*, IMListLoad, LoadUserEquip, LoadUserMail, UserQuestList, NickNameCheck, …) query SQL per request and return uncompressed XML. The full list of 122 names is in `ddtank41-request-ashx-list.txt`.
- XML attribute names come from `Road.Flash/FlashUtils.Create*Info`. Those functions define the schema the client parses; port them exactly.

---

## 3. Combat physics (server-authoritative)

- **Where it runs:** `Game.Logic` holds the turn logic, physics and damage. It runs in Road for free/PvE rooms and in Fighting for matchmade PvP (Fighting ticks every 40 ms). The client sends the shot as GAME_CMD → FIRE with x, y, force and angle. The server **simulates the whole flight up front** (`SimpleBomb.StartMoving`, a loop until the bomb stops) and produces a timestamped list of `BombAction`s (BOMB, KILL_PLAYER, CURE, FORZEN, TRANSLATE, START_MOVE, …). It sends these together with the initial vx/vy in one packet (`Living.cs` around line 1770). The client's `phy.*` (same `EulerVector`) animates the flight and replays the actions.
- **Integrator** (`EulerVector.ComputeOneEulerStep(m, af, f, dt)`): `a = (f - af*v)/m; v += a*dt; x += v*dt`, with **dt = 0.04 s**.
  - x axis: `f = wf = map.wind * ball.Wind`. y axis: `f = gf = map.gravity(MapInfo.Weight) * ball.Weight * ball.Mass`. Drag: `af = arf = map.airResistance(MapInfo.DragIndex) * ball.DragIndex`.
  - Initial velocity: `vx = int(force*cos(angle°))`, `vy = int(force*sin(angle°))`. Weapons with 3 shots use `(force*0.9, angle-5)` and `(force*1.1, angle+5)`.
  - **Floating-point determinism:** C# uses `float` (f32) here and truncates to int. To match the client's preview exactly, use `Math.fround` in TS.
- **Collision:** `BombObject.MoveTo` walks the line between the old and new point in **3-pixel steps**, using a 6×6 rect centered on the bomb. At each step it checks, in order: physical objects (players, NPCs, boxes), then ground (`Map.IsRectangleEmpty`), then out of map (`IsOutMap` makes the bomb die).
- **Map bitmap:** each map has `map\{id}\fore.map` (diggable terrain) and `dead.map` (indestructible). File format: `i32 LE width`, `i32 LE height`, then `(width/8+1) * height` bytes, 1 bit per pixel, MSB first, 1 = solid. The files are generated from PNG pixels with alpha > 100. `Dig(cx,cy,shape)` clears the bomb's shape `Tile`. The C# `Add()` (border) is marked as a TODO in the source.
- **Wind:** `GetNextWind` takes a random walk of ±0–1.0 per turn toward a random target in [-4, 4]. `GetVane` turns it into display digits through `WindMgr`. `BallInfo` (Power, Radii, Mass, Weight, Wind, DragIndex, Shake, IsSpin, …) comes from `BallList.xml` / the DB.
- **Turn order:** whoever has the lowest `Delay` acts next. See the AloneInAbyss combat doc.

---

## 4. Implications for our Node/TS port

1. **We are building, not porting another rewrite.** No alternative implementation exists to copy. Use the 4.1 C# code as the specification and the 4.1 AS3 client as the oracle. Pick **one client build** and treat its `ePackageType`, `CrazyTankPackageType` and `GameRoomPackageType` as the source of truth; codes changed between versions.
2. **Codec first.** Write a `PacketCodec` with: 20-byte BE header; checksum `(119+Σ[6..]) & 0x7F7F`; a per-connection `RollingKey` (SEND/RECV `Uint8Array(8)`, reset to K0, set after LOGIN); a stream reassembler that scans for 0x71AB using a cloned key; and a NUL-terminated UTF string writer. Add golden tests using byte sequences produced by running the AS3 `ByteSocket.send` logic (port it to TS once as a reference implementation and fuzz-compare). Answer `<policy-file-request/>` on the same socket.
3. **RSA:** use `crypto.privateDecrypt({key, padding: RSA_PKCS1_PADDING})`. Convert the .NET `<RSAKeyValue>` XML to PEM/JWK. Either recover the private key that matches the client's modulus, or generate our own pair and patch the base64 modulus string in `DDT.as` / the SWF. Caveat: since Node 18.19 / 20.11 / 21.6, `privateDecrypt` with `RSA_PKCS1_PADDING` is **disabled by default** (the Marvin-attack fix for CVE-2023-46809). It only works again with `--security-revert=CVE-2023-46809`. The other options are a pure-JS v1.5 unpad on top of a raw `RSA_NO_PADDING` decrypt, or `node-forge`. A 1024-bit key is weak, but the client requires it.
4. **Keep all three tiers but simplify them.** (a) An HTTP service (Fastify) that replaces Tank.Request: `<Result>` XML builders, static template XMLs pre-built as zlib, `CreateLogin`/`Login.ashx` with the ticket check enforced. (b) The game socket server (Road). (c) Combat in the same process, or as a worker per room (Fighting). Center and its WCF can become an in-process service or Redis for login state and allow-user-login, because we control both ends. The client only ever talks to Request over HTTP and to Road (and possibly Fighting) over TCP.
5. **Physics port:** this is a small, self-contained module of about 600 lines (`EulerVector`, `BombObject`, `SimpleBomb`, `Tile`, `Map`). Use `Math.fround` for f32 behavior, `| 0` truncation, and a `Uint8Array` bitset for `.map` (read with `readInt32LE`). Unit-test trajectories against the client preview. The bomb resolves in one synchronous loop, so no tick-accurate simulation is needed; only turn timers need it.
6. **Client delivery:** the Flash client only runs in the FP32 projector or in launchers (ZeroHelper, Electron with Pepper Flash). If we want browser play later, put a **websockify-style WS↔TCP bridge** in front of the server, or accept WebSocket natively in Node. Do this in the same server so both transports share the codec. Ruffle is the browser path, but its AS3 support is currently blocked on `UIModuleLoader`; BrunoSzczuk's repo is a test harness for that.
7. **Compression and XML:** use `zlib.deflateSync(buf, {level: 9})`, which matches the client's `uncompress()`. Build the XML with a deterministic builder that copies the C# attribute order and names from `FlashUtils`. Some client parsers are positional or case-sensitive.
8. **Legal and licensing:** every source tree is leaked 7Road code with no real license, even where a repo shows MIT. Our TS code should be a clean reimplementation from the protocol behavior described here. Do not vendor C# or AS3 files, and keep assets separate.
