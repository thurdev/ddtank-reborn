# 02 - Client Runtime: running the DDTank AS3 client in 2026

Research date: 2026-10-01. Scope: how players run the original 7Road Flash/AS3 client (TCP `flash.net.Socket` + HTTP `.ashx` + HTTP resources + socket policy on 843) without installing a legacy stack.

---

## TL;DR

- **Primary: self-hosted Ruffle (web/WASM) + a WebSocket listener built into our Node game server.** Ruffle tunnels `flash.net.Socket` / `XMLSocket` over WebSocket using the `socketProxy` config. It sends and receives binary WS frames, and it ignores socket policy files. Someone else is already doing this with DDTank: the `trinhtanphat/DDTank41` and `DDTank-3.0` repos had a run of "fix X under Ruffle" PRs in 2025-2026. They made it work, **but only by patching the client AS3**. Plan for client patches.
- **Fallback: a downloadable launcher** (Windows, Electron or .NET) that bundles **Ruffle desktop** first and the **Flash Player 32 projector** second. Both connect over raw TCP. Our server answers the `<policy-file-request/>` on 843 and in-band on the game port.
- No usable HTML5 reimplementation of the DDTank client exists in public. A rewrite is a separate, very large project.

---

## 1. Ruffle (ruffle.rs) status in 2026

### 1.1 General AVM2 compatibility
- Official compatibility page (ruffle.rs/compatibility) currently says: **AVM2 language 90%, AVM2 API 82%** (AVM1 is 99% / 82%). The project's own summary is that "most games will work well enough to be played". The Sept 2024 blog had AVM2 API at 76%, so progress is steady.
- There are **no stable releases. Ruffle ships nightlies only** (the latest nightly when this was written was 2026-10-01). Recent nightlies are still filling in AVM2 surface area: atomic memory ops, TextLine, `BitmapData.draw` fixes, gradient coercion, flash.sensors stubs. **We must pin a specific nightly** and upgrade on purpose.
- Rendering uses wgpu (WebGPU / WebGL2) with a canvas fallback. AVM2 runs in an **interpreter (no JIT)**. A turn-based game like DDTank is usually fine, but heavy frames (big explosions, many filters, crowded rooms) can drop frames on low-end machines.

### 1.2 DDTank / Gunny specifically (the key evidence)
- **`trinhtanphat/DDTank41`** ("Full Source DDTank Version 41") and **`trinhtanphat/DDTank-3.0`** (Gunny 3.0), with sibling repo `Gunny-Infrastructure` ("endpoint and fleet deployment tooling for Gunny v389 and DDTank 3.0"). Their PR titles and descriptions show DDTank **running under Ruffle on both web and standalone**, after client-side fixes:
  - `fix(audio): use MP3 Sound playback under Ruffle`: background music used to go through **NetConnection/NetStream FLV**. It was replaced with `Sound` + `SoundChannel` + `URLRequest` MP3. This means NetStream/FLV audio is unreliable in Ruffle.
  - `fix: recover Ruffle projectile preparation`: "bounding stuck Ruffle firing bitmap actions in `GameCharacter.actionPlaying()` so prepare/shot state cannot block projectile creation forever". This is a MovieClip/frame-script timing difference.
  - `Fix Ruffle Bomb target projectile crash` (made the Bomb `target` property "Ruffle-safe").
  - `Fix Gunny 3.0 projectile trail rendering`: the trail emitter is only created when `changedPartical` is non-empty.
  - `fix(exit): close Ruffle ...`: on standalone Ruffle it falls back to `fscommand("quit")` when `ExternalInterface` is unavailable.
  - Others: "preserve crater holes and battle SFX", "restore projectile impact targeting", "Ruffle click-to-plant seed bridge" (farm).
  - Note: these repos returned **404 when fetched on 2026-10-01** (made private or deleted). Only the search-engine snippets were available. If we can get hold of a mirror or fork, it is the most valuable reference we know of.
- Ruffle issue **#18896**: "Error on ddtank.337.games/S88". A **`capacity overflow` panic inside `Loader.loadBytes()`** from DDTank's module loader (Dec 2024 nightly). It is still open. DDTank loads modules as URLLoader bytes, sometimes decrypts them, then calls `Loader.loadBytes`, so this path has to be tested on our client version.
- Ruffle issue **#21094** (a different Chinese MMO, same architecture) hit exactly the three problems we will hit: (1) **CORS** on the resource CDN, (2) **missing device fonts** (宋体, Times New Roman bold/italic), (3) "Missing WebSocket proxy for host X, port Y" until `socketProxy` was configured.
- Community: Vietnamese "Gunny lậu" servers in 2025-2026 advertise PC + mobile play. Most use launchers, not Ruffle. A .NET 8 WPF `barisffs/ddtank-launcher` lets the user pick **Ruffle or the Flash Player projector**.

### 1.3 Networking APIs in Ruffle

| Feature | Status | Notes for DDTank |
|---|---|---|
| `flash.net.Socket` (AS3) | Implemented. Desktop: real TCP. Web: tunnelled over WebSocket via `socketProxy` | The web code (`web/src/navigator.rs` `connect_socket`) finds an entry with `x.host == host && x.port == port`. **It is an exact string match** on what the SWF passes to `connect()`. If nothing matches it logs `Missing WebSocket proxy for host {}, port {}` and fires a connect failure. All traffic is **binary WS frames** (`Message::Bytes`); incoming text frames are logged and ignored. The **timeout argument is ignored**. |
| `flash.net.XMLSocket` | Implemented, same `socketProxy` path | DDTank does not use it for gameplay. |
| Socket policy files (843, `<policy-file-request/>`) | **Not performed.** `Security.loadPolicyFile`, `allowDomain` and `allowInsecureDomain` are `avm2_stub_method` no-ops (verified in `core/src/avm2/globals/flash/system/security.rs`) | The WS endpoint will never see a policy request. Leave the client's `loadPolicyFile` calls alone, since they are harmless. |
| `URLLoader` / `URLRequest` (.ashx, XML, resources) | Implemented via browser `fetch` | **The browser's CORS rules apply; `crossdomain.xml` is ignored.** Either serve everything same-origin or send `Access-Control-Allow-Origin` on the request/resource hosts. Default `upgradeToHttps: true` rewrites `http://` to `https://` on an HTTPS page. |
| `Loader.load` / `loadBytes`, `ApplicationDomain`, `getDefinitionByName` | Implemented | The DDTank module system relies on these. Watch issue #18896 (loadBytes panic). |
| `ByteArray.compress/uncompress/deflate/inflate` | Native implementations exist (zlib, deflate; `deflate()`/`inflate()` wrap compress/uncompress) | Only `shareable` is stubbed. DDTank packet decompression and compressed resource unpacking should work. |
| `BitmapData`, filters (Glow, Blur, DropShadow, ColorMatrix, Bevel) | Implemented, mostly GPU-based; some edge methods are partial | Visual differences are possible (glow/outline text, `applyFilter` edge cases). Test the character, avatar and weapon composite rendering. |
| `Sound` / `SoundChannel` (MP3, embedded) | Works | **NetStream/FLV audio is unreliable.** Convert background music to MP3 `Sound`, as trinhtanphat did. Browsers block audio until a user gesture; set `unmuteOverlay`/`autoplay` accordingly. |
| `ExternalInterface` | Works on web only when `allowScriptAccess: true`. Unavailable in standalone Ruffle | DDTank calls JS for recharge, logout, fullscreen and similar. Guard these calls. |
| `SharedObject` (local) | Works (browser localStorage) | Fine for settings. |
| Device fonts | Ruffle has no system fonts, only a bundled default sans | **Must supply fonts** (`fontSources` + `defaultFonts`), especially CJK/Vietnamese/Portuguese glyphs and Tahoma/Arial/SimSun. Otherwise text breaks. |

### 1.4 Relevant config options (from ruffle-core `BaseLoadOptions`)
`allowNetworking` (default `all`), `allowScriptAccess` (false), `socketProxy` ([]), `urlRewriteRules` ([pattern, replacement][]), `base`, `parameters` (flashvars), `preferredRenderer`, `quality`, `scale`, `forceScale`, `letterbox`, `autoplay`, `unmuteOverlay`, `splashScreen`, `contextMenu`, `maxExecutionDuration` (15 s), `frameRate`, `openUrlMode`, `upgradeToHttps` (true), `compatibilityRules`, `playerRuntime`, `defaultFonts`, `fontSources`, `credentialAllowList`, `publicPath`, `polyfills`, `logLevel`, `wmode`, `gamepadButtonMapping`.

---

## 2. Alternatives

| Option | What it is | Pros | Cons / legal |
|---|---|---|---|
| **Ruffle desktop** (`ruffle.exe`, Win/macOS/Linux) | Native Ruffle build | Real TCP (no WS needed), open source (MIT/Apache-2.0), **redistributable** | Same AVM2 gaps as web, and no ExternalInterface. |
| **Flash Player 32 projector** (`flashplayer_32_sa.exe`, 32.0.0.465) | Adobe standalone player | Highest fidelity, since it is the real Flash VM. The standalone projector is **not affected by the plugin EOL kill switch** | Adobe EULA: redistribution was historically licensed. Bundling it in a launcher is legally grey; most private servers do it anyway. No security updates: an unpatched VM loading remote content. Windows-first (mac/linux builds exist but age badly). **Requires the socket policy server** (843 or in-band). |
| **CleanFlash** (`darktohka/clean-flash-builds`, CleanFlash_Installer 34.0.0.330) | Repackaged Flash 34 from the Chinese (Zhongcheng/2144) branch, adware stripped, plus FlashPatch | Still maintained; installs plugins for old browsers plus a standalone player | Asking users to "install CleanFlash" is a legacy install, which goes against the project goal. Licensing/provenance is grey. Plugins only work in old or forked browsers. |
| **Electron + PepperFlash** | Electron <= 11 with `--ppapi-flash-path` | Gives a "browser" launcher that can run the website and the game together | **PPAPI was removed in Electron 12.** You would ship a 2020-era Chromium (many CVEs) plus Flash 32.0.0.371 or older (or FlashPatch'd 465, because of the timebomb). Large security risk. Not recommended. |
| **Custom CefSharp/.NET launchers** (the typical Gunny/DDTank private-server launcher) | Old CEF with PepperFlash, or Flash ActiveX in WinForms | What players already know | Same security and licensing problems as above. ActiveX Flash also needs a kill-switch patch. |
| **Lightspark** | Open-source C++ Flash player, 0.9.0 (Feb 2025) | Has an AVM2 JIT (LLVM) | Small team, weak on large AS3 games, no WASM web story comparable to Ruffle, no known DDTank reports. Not a fit. |
| **Harman AIR SDK** (51.3.x in 2026) | Maintained AIR runtime; the client could be repackaged as an AIR desktop/mobile app (captive runtime) | Maintained, real Flash VM. Real TCP sockets with **no policy files needed** in the AIR app sandbox. Could even give Android/iOS builds | Requires **repackaging and recompiling the client as an AIR app**: Stage/ExternalInterface differences and testing. License: free tier only below $50k/yr revenue, with a splash screen; paid tiers above that. Harman's "Flash Player 50" is enterprise-only, not a distributable binary. A good *phase-3* option for a desktop/mobile build. |

---

## 3. HTML5 / JS remakes and DDTank mobile

- **No public, playable HTML5 reimplementation of the original DDTank client** compatible with the 7Road protocol was found (GitHub, RaGEZONE).
  - `3nderXP/ddtank` ("DDTank Paraguai"): Phaser 3 + PHP, 7 commits, no licence, an "inspired by" toy. Not useful.
  - RaGEZONE DDTank Releases has server/emulator dumps (versions 3.0 through 10.5, "Full datasource DDTank China") and C# emulators. All of them assume the Flash client.
- **Official mobile:** 7Road and Tencent ship *弹弹堂手游* (CN), **DDTank Origin** (VNG / 7Road, `com.road7.ddtankbr.gp`, iOS/Android) and **DDTank Mobile** (`com.wan.ddten`). These are separate native clients with different protocols. They are not a drop-in for the Flash server protocol and are closed source. Some Vietnamese private servers advertise "PC + Mobile", usually by running a mobile private build or a WebView.
- Implication: a "modern client" means **reimplementing the client** (for example PixiJS/Phaser with our own TS protocol lib, reusing extracted assets). That is many person-months. Keep it as a long-term option only. The binary protocol layer in our Node server should stay transport-agnostic, so a future native or HTML5 client can talk to it.

---

## 4. TCP <-> WebSocket bridge in Node (built into the game server)

### 4.1 Design
- **One protocol core, two transports.** The game server's packet codec takes a *byte stream* (`onData(buf)` into a reassembly buffer, then frames split by the DDTank header and length). Both the TCP socket and the WebSocket feed the same `Connection` object.
- **Treat WS messages as stream chunks, not packets.** Ruffle forwards whatever `Socket.flush()` produced. One WS message may hold several packets or a partial one, exactly like TCP. Reuse the same reassembly logic.
- **Policy handling (needed for the Flash projector only):**
  - Port **843**: on `<policy-file-request/>\0`, reply with the policy XML + `\0` and close.
  - **In-band on the game port**: if the first 23 bytes of a new TCP connection are `<policy-file-request/>\0`, reply with the policy and close. This also covers Flash's fallback when 843 is unreachable, which happens on many clouds.
  - WebSocket: never needed (Ruffle stubs policy loading).
- **TLS:** pages served over HTTPS must use `wss://` (mixed-content rules). Terminate TLS at Caddy/nginx/Cloudflare in front of Node and proxy `/ws` with the Upgrade headers. Cloudflare proxies WebSockets on 443 for free. Raw TCP through Cloudflare needs Spectrum (paid), so WS is also the better path for DDoS protection.
- **Security:** check the `Origin` header on WS upgrade (allow only our site origins), cap WS message size (for example 64 KiB), set an idle timeout, rate-limit per IP, and use `perMessageDeflate: false` (packets are small; avoids CPU and zip-bomb risk).
- Off-the-shelf options if we want an external bridge: Python `websockify` (what Ruffle's FAQ recommends; supports `--token-plugin ReadOnlyTokenFile` for multiple backends), or Node ports (`maximegris/node-websockify`, `Simplemnt/node-websockify`). **Built-in is preferred:** no extra hop, and we get the real client IP for bans and logging.

### 4.2 Reference implementation (TypeScript, `ws` package)

```ts
// transport.ts - same codec for TCP and WebSocket
import net from "node:net";
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";

const POLICY_REQ = Buffer.from("<policy-file-request/>\0", "latin1");
const POLICY_XML =
  `<?xml version="1.0"?><cross-domain-policy>` +
  `<allow-access-from domain="*" to-ports="843,9200-9210"/>` +
  `</cross-domain-policy>\0`;

export interface Transport {
  send(buf: Buffer): void;
  close(): void;
  remoteAddress: string;
}

// The game's Connection: owns the reassembly buffer + DDTank packet codec.
export interface ConnectionFactory {
  (t: Transport): { onData(chunk: Buffer): void; onClose(): void };
}

// --- 843 policy server (Flash projector only) ---
export function startPolicyServer(port = 843) {
  net.createServer((s) => {
    s.setTimeout(5000, () => s.destroy());
    s.once("data", () => s.end(POLICY_XML, "latin1"));
    s.on("error", () => {});
  }).listen(port);
}

// --- Raw TCP game listener (Ruffle desktop, Flash projector) ---
export function startTcp(port: number, make: ConnectionFactory) {
  net.createServer((sock) => {
    sock.setNoDelay(true);
    let conn: ReturnType<ConnectionFactory> | null = null;
    let sniff: Buffer | null = Buffer.alloc(0);

    sock.on("data", (chunk) => {
      if (sniff) {                       // sniff for in-band policy request
        sniff = Buffer.concat([sniff, chunk]);
        if (sniff.length < POLICY_REQ.length && POLICY_REQ.subarray(0, sniff.length).equals(sniff)) return;
        if (sniff.subarray(0, POLICY_REQ.length).equals(POLICY_REQ)) { sock.end(POLICY_XML, "latin1"); return; }
        chunk = sniff; sniff = null;
        conn = make({
          send: (b) => sock.write(b),
          close: () => sock.destroy(),
          remoteAddress: sock.remoteAddress ?? "",
        });
      }
      conn!.onData(chunk);
    });
    sock.on("close", () => conn?.onClose());
    sock.on("error", () => sock.destroy());
  }).listen(port);
}

// --- WebSocket game listener (Ruffle web via socketProxy) ---
export function startWs(server: http.Server, path: string, allowedOrigins: string[], make: ConnectionFactory) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 64 * 1024,
    perMessageDeflate: false,
  });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname !== path || !allowedOrigins.includes(req.headers.origin ?? "")) {
      socket.destroy(); return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      // trust X-Forwarded-For only from our reverse proxy
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ?? req.socket.remoteAddress ?? "";
      const conn = make({
        send: (b) => ws.readyState === WebSocket.OPEN && ws.send(b, { binary: true }),
        close: () => ws.close(),
        remoteAddress: ip,
      });
      ws.on("message", (data, isBinary) => {
        if (!isBinary) return;                    // Ruffle only sends binary
        conn.onData(Buffer.isBuffer(data) ? data : Buffer.concat(data as Buffer[]));
      });
      ws.on("close", () => conn.onClose());
      ws.on("error", () => ws.terminate());
    });
  });
}
```

Reverse proxy (Caddy) example:
```
play.example.com {
    reverse_proxy /ws* 127.0.0.1:8080      # Node: HTTP + WS upgrade
    reverse_proxy /request/* 127.0.0.1:8080 # .ashx emulation
    file_server /flash/* { root /srv/ddtank }   # SWFs, resources, ruffle/
}
```

---

## 5. RECOMMENDATION

### 5.1 Primary path: browser play via self-hosted Ruffle + built-in WS transport
1. **Self-host Ruffle** (`@ruffle-rs/ruffle` npm package or a pinned nightly zip) under `/ruffle/` on the **same origin** as the game page. Pin the version and keep a regression checklist.
2. **Serve everything same-origin** (`https://play.example.com`): `Loading.swf`, `config.xml`, `.ashx` request endpoints, resources/SWF modules, fonts. This removes CORS entirely. If resources must live on a CDN or R2, send `Access-Control-Allow-Origin: https://play.example.com` on them. Use `urlRewriteRules` to remap hardcoded legacy hosts in the client (old flash/resource URLs) without editing the SWF.
3. **Game server listens on TCP 9200 (+843 policy) and on WS `/ws`.** In `config.xml` / the server list (.ashx), advertise a hostname, for example `game.example.com:9200`. Ruffle matches that exact host:port string and maps it to `wss://play.example.com/ws`. The launcher (fallback path) connects to the same host:port over raw TCP.
4. **Fonts:** ship WOFF2/TTF subsets (Tahoma/Arial-alike plus Noto Sans for Latin-ext/VI/PT plus Noto Sans SC if CN strings remain) via `fontSources`, and map `defaultFonts`.
5. **Expect client patches** (decompile and recompile with JPEXS FFDec, or AS3 source if we have it). Known targets: FLV/NetStream audio becomes MP3 `Sound`; frame-script timing in `GameCharacter.actionPlaying`; Bomb `target`; projectile trail; `ExternalInterface` guards; `loadBytes` module path. Budget a **Ruffle-compat QA pass**: login, create character, hall, room, the whole battle loop (aim, wind, shoot, crater, death), shop/equip/avatar composite, chat, guild, farm, sounds.
6. Contribute minimal repros upstream to ruffle-rs when we hit emulator bugs. Do not maintain a Ruffle fork unless forced to.

**Embedding snippet** (React page or a plain HTML template):

```html
<script>
  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer.config = {
    publicPath: "/ruffle/",            // self-hosted wasm/js
    polyfills: false,                  // we embed explicitly
    autoplay: "on",
    unmuteOverlay: "hidden",           // we show our own "click to play" gate
    splashScreen: false,
    letterbox: "on",
    scale: "showAll",
    quality: "high",
    preferredRenderer: "webgpu",       // falls back to wgpu-webgl / webgl / canvas
    allowScriptAccess: true,           // DDTank uses ExternalInterface (recharge, logout, fullscreen)
    allowNetworking: "all",
    upgradeToHttps: true,
    openUrlMode: "allow",
    maxExecutionDuration: 30,          // big module init can exceed 15s on slow PCs
    logLevel: "warn",
    contextMenu: "rightClickOnly",
    socketProxy: [
      { host: "game.example.com", port: 9200, proxyUrl: "wss://play.example.com/ws" },
      // one entry per channel/line if the server list advertises several ports:
      { host: "game.example.com", port: 9201, proxyUrl: "wss://play.example.com/ws?line=2" }
    ],
    urlRewriteRules: [
      [/^https?:\/\/old-resource\.7road\.example\/(.*)$/, "https://play.example.com/flash/$1"]
    ],
    fontSources: ["/fonts/NotoSans-Regular.ttf", "/fonts/NotoSans-Bold.ttf", "/fonts/NotoSansSC-Regular.otf"],
    defaultFonts: { sans: ["Noto Sans", "Noto Sans SC"], serif: ["Noto Sans"], typewriter: ["Noto Sans"] }
  };
</script>
<script src="/ruffle/ruffle.js"></script>
<div id="game" style="width:1000px;height:600px"></div>
<script>
  const ruffle = window.RufflePlayer.newest();
  const player = ruffle.createPlayer();
  player.style.width = "1000px"; player.style.height = "600px";
  document.getElementById("game").appendChild(player);
  player.ruffle().load({                      // `player.load(...)` on older builds
    url: "/flash/Loading.swf",
    base: "/flash/",
    parameters: {                              // flashvars, the same ones the original Default.aspx passed
      site: "https://play.example.com/request/",
      user: SESSION_USER, key: SESSION_KEY,    // one-time login token from our React site
      config: "/flash/config.xml"
    }
  });
</script>
```
(Check the option enum strings, such as `autoplay: "on"`, `letterbox: "on"`, `contextMenu: "rightClickOnly"`, against the pinned ruffle-core version's `Config` docs. Some were renamed over time.)

### 5.2 Fallback path: downloadable launcher (Windows first)
- A small **Electron (current version, no Flash plugin)** or .NET launcher that handles login and patching, then starts:
  1. **Ruffle desktop** (bundled, legally redistributable) with `ruffle.exe --parameters ... https://play.example.com/flash/Loading.swf` over raw TCP; or
  2. **Flash Player 32 projector** (user opt-in or a separate download, given the EULA grey area) for anything Ruffle still renders incorrectly.
- The server already exposes TCP 9200 plus policy on 843/in-band, and `crossdomain.xml` at the HTTP roots (the projector does enforce it).
- Phase 3 (optional): repackage as a **Harman AIR captive-runtime** app for desktop and maybe Android. This needs a licence once revenue passes $50k/yr.

### 5.3 Biggest risks
1. **Client patches are required**, not optional (proven by the trinhtanphat PR history). We need the client AS3 source or a reliable FFDec round-trip for our specific client version.
2. **Ruffle has no stable release.** A nightly upgrade can regress, so pin it and keep a QA checklist.
3. **`Loader.loadBytes` panic (#18896)** and other AVM2 gaps in DDTank's module loader could block loading entirely on some client versions.
4. **Performance** on low-end PCs and Chromebooks (AVM2 interpreter, filters). Mobile browsers technically work but have no keyboard; DDTank's UI is mouse-heavy.
5. **Fonts/i18n:** missing glyphs if fonts aren't supplied.
6. **Legal:** 7Road IP (the whole private-server premise) plus Flash projector redistribution. Ruffle itself is permissively licensed.
7. **Security:** never ship old Chromium+PepperFlash. Validate WS Origin; the binary protocol must be hardened server-side, since any client can speak it.

---

## Sources
- Ruffle compatibility: https://ruffle.rs/compatibility, https://ruffle.rs/compatibility/avm2
- Ruffle socket proxy FAQ: https://github.com/ruffle-rs/ruffle/wiki/Frequently-Asked-Questions-For-Users
- Ruffle config wiki: https://github.com/ruffle-rs/ruffle/wiki/Using-Ruffle
- ruffle-core docs: https://ruffle.rs/js-docs/master/interfaces/Config.SocketProxy.html, https://ruffle.rs/js-docs/master/interfaces/Config.BaseLoadOptions.html
- Ruffle web socket implementation: https://github.com/ruffle-rs/ruffle/blob/master/web/src/navigator.rs
- Security stubs: https://github.com/ruffle-rs/ruffle/blob/master/core/src/avm2/globals/flash/system/security.rs
- ByteArray: https://github.com/ruffle-rs/ruffle/blob/master/core/src/avm2/globals/flash/utils/ByteArray.as
- Releases (nightlies): https://github.com/ruffle-rs/ruffle/releases
- Blog (Sept 2024 progress): https://ruffle.rs/blog
- DDTank Ruffle crash: https://github.com/ruffle-rs/ruffle/issues/18896
- Similar MMO (CORS/fonts/socketProxy): https://github.com/ruffle-rs/ruffle/issues/21094
- CORS vs crossdomain.xml: https://github.com/ruffle-rs/ruffle/discussions/8972, https://github.com/ruffle-rs/ruffle/issues/1008
- Socket support history: https://github.com/ruffle-rs/ruffle/issues/905
- DDTank-on-Ruffle PRs (repos now 404): https://github.com/trinhtanphat/DDTank41/pull/2, /pull/17, https://github.com/trinhtanphat/DDTank-3.0/pull/64, /pull/58, /pull/52, https://github.com/trinhtanphat/Gunny-Infrastructure
- Launchers: https://github.com/barisffs/ddtank-launcher, https://github.com/ipisboomz/DDTankNewEraCLient/releases
- CleanFlash: https://github.com/darktohka/clean-flash-builds, https://github.com/TCOTC/CleanFlash_Installer
- Electron Pepper Flash removal: https://www.electronjs.org/docs/latest/breaking-changes
- Harman AIR: https://airsdk.dev/news, https://airsdk.harman.com/faq
- Lightspark: https://en.wikipedia.org/wiki/Lightspark
- HTML5 remake: https://github.com/3nderXP/ddtank
- RaGEZONE DDTank: https://forum.ragezone.com/community/ddtank-releases.818/
- websockify / Node ports: https://pypi.org/project/websockify/, https://github.com/maximegris/node-websockify
- DDTank Origin: https://play.google.com/store/apps/details?id=com.road7.ddtankbr.gp
